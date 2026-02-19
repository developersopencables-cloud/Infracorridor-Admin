import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkAdminSession } from '@/database/auth-utils';
import { getDb } from '@/database/mongoose';
import connectMongoose from '@/database/mongoose-connection';
import { SyncHistoryModel } from '@/models';
import { ObjectId } from 'mongodb';
import { hashPassword } from 'better-auth/crypto';

export async function GET(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized. Admin access required.',
                },
                { status: 401 }
            );
        }

        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const adminOnly = searchParams.get('adminOnly') === 'true';
        const search = searchParams.get('search');


        const query: Record<string, unknown> = {};


        if (adminOnly) {
            query.role = 'admin';
        } else if (role) {
            query.role = role;
        }


        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            query.$or = [
                { email: searchRegex },
                { name: searchRegex },
            ];
        }


        const users = await db.collection('user')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // Connect Mongoose before using SyncHistoryModel
        await connectMongoose();

        const usersWithSyncHistory = await Promise.all(
            users.map(async (user) => {
                const syncHistoryCount = await SyncHistoryModel.countDocuments({
                    userId: user._id.toString(),
                });

                const latestSync = await SyncHistoryModel.findOne({
                    userId: user._id.toString(),
                })
                    .sort({ timestamp: -1 })
                    .select('timestamp status')
                    .lean();

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name || null,
                    role: user.role || 'user',
                    emailVerified: user.emailVerified || false,
                    image: user.image || null,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    syncHistoryCount,
                    latestSync: latestSync
                        ? {
                            timestamp: latestSync.timestamp,
                            status: latestSync.status,
                        }
                        : null,
                };
            })
        );


        const roleStats = {
            admin: usersWithSyncHistory.filter((u) => u.role === 'admin').length,
            user: usersWithSyncHistory.filter((u) => u.role === 'user').length,
            buyer: usersWithSyncHistory.filter((u) => u.role === 'buyer').length,
            seller: usersWithSyncHistory.filter((u) => u.role === 'seller').length,
            total: usersWithSyncHistory.length,
        };

        return NextResponse.json({
            success: true,
            data: usersWithSyncHistory,
            count: usersWithSyncHistory.length,
            stats: roleStats,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch users',
            },
            { status: 500 }
        );
    }
}
export async function POST(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized. Admin access required.',
                },
                { status: 401 }
            );
        }

        const db = await getDb();
        const body = await request.json();
        const { email, name, password, role } = body;

        if (!email || !password || !name || !role) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Email, name, password, and role are required',
                },
                { status: 400 }
            );
        }

        const existingUser = await db.collection('user').findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User with this email already exists',
                },
                { status: 400 }
            );
        }


        const hashedPassword = await hashPassword(password);


        const userResult = await db.collection('user').insertOne({
            email,
            name,
            role,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const userId = userResult.insertedId;
        const accountId = userId.toString();


        await db.collection('account').insertOne({
            accountId: accountId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            data: {
                id: userId.toString(),
                email,
                name,
                role,
                emailVerified: false,
            },
            message: 'User created successfully',
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create user',
            },
            { status: 500 }
        );
    }
}
export async function PUT(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized. Admin access required.',
                },
                { status: 401 }
            );
        }

        const db = await getDb();
        const body = await request.json();
        const { userId, role, name, emailVerified } = body;

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required',
                },
                { status: 400 }
            );
        }

        // Validate role if provided
        if (role && !['admin', 'user', 'buyer', 'seller'].includes(role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid role. Must be "admin", "user", "buyer", or "seller"',
                },
                { status: 400 }
            );
        }

        // Build update object
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (role !== undefined) {
            updateData.role = role;
        }
        if (name !== undefined) {
            updateData.name = name;
        }
        if (emailVerified !== undefined) {
            updateData.emailVerified = emailVerified;
        }


        const userQuery = ObjectId.isValid(userId)
            ? { _id: new ObjectId(userId) }
            : { _id: userId };

        const result = await db.collection('user').updateOne(
            userQuery,
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            );
        }


        const updatedUser = await db.collection('user').findOne(userQuery);

        return NextResponse.json({
            success: true,
            data: {
                id: updatedUser!._id.toString(),
                email: updatedUser!.email,
                name: updatedUser!.name || null,
                role: updatedUser!.role || 'user',
                emailVerified: updatedUser!.emailVerified || false,
                image: updatedUser!.image || null,
                createdAt: updatedUser!.createdAt,
                updatedAt: updatedUser!.updatedAt,
            },
            message: 'User updated successfully',
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update user',
            },
            { status: 500 }
        );
    }
}


export async function DELETE(request: NextRequest) {
    try {
        const headersList = await headers();
        const adminCheck = await checkAdminSession(headersList);

        if (!adminCheck || !adminCheck.isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized. Admin access required.',
                },
                { status: 401 }
            );
        }

        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required',
                },
                { status: 400 }
            );
        }

        // Prevent deleting yourself
        if (userId === adminCheck.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You cannot delete your own account',
                },
                { status: 400 }
            );
        }

        // Validate and convert userId to ObjectId
        if (!ObjectId.isValid(userId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid user ID format',
                },
                { status: 400 }
            );
        }

        const userQuery = { _id: new ObjectId(userId) };

        // Delete user
        const result = await db.collection('user').deleteOne(userQuery);

        if (result.deletedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            );
        }

        // Optionally delete user's sync history
        await SyncHistoryModel.deleteMany({ userId });

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete user',
            },
            { status: 500 }
        );
    }
}

