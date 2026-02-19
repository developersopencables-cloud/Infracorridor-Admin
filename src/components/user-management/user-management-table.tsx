"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, Edit, Trash2, Loader2, Users, X, CheckCircle2, XCircle, Shield, User, ShoppingCart, Store } from "lucide-react";
import { format } from "date-fns";
import { Pagination } from "@/components/common/pagination";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user" | "buyer" | "seller";
  emailVerified: boolean;
  image: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  syncHistoryCount?: number;
  latestSync?: {
    timestamp: string | Date;
    status: string;
  } | null;
}

interface UserManagementTableProps {
  users: User[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: "all" | "admin" | "user" | "buyer" | "seller" | null;
  onRoleFilterChange: (
    role: "all" | "admin" | "user" | "buyer" | "seller" | null
  ) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  stats?: {
    admin: number;
    user: number;
    buyer: number;
    seller: number;
    total: number;
  };
  totalItems: number;
  currentPage: number;
}

export function UserManagementTable({
  users,
  loading,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  onEdit,
  onDelete,
  stats,
  totalItems,
  currentPage,
}: UserManagementTableProps) {
  const adminCount = stats?.admin || users.filter((u) => u.role === "admin").length;
  const userCount = stats?.user || users.filter((u) => u.role === "user").length;
  const buyerCount = stats?.buyer || users.filter((u) => u.role === "buyer").length;
  const sellerCount = stats?.seller || users.filter((u) => u.role === "seller").length;

  const clearFilters = () => {
    onSearchChange("");
    onRoleFilterChange(null);
  };

  const hasActiveFilters = searchQuery || (roleFilter !== null && roleFilter !== "all");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={roleFilter === "all" || roleFilter === null ? "default" : "outline"}
                size="default"
                onClick={() => onRoleFilterChange(roleFilter === "all" || roleFilter === null ? null : "all")}
              >
                <Users className="w-4 h-4 mr-2" />
                All ({stats?.total || users.length})
              </Button>
              <Button
                variant={roleFilter === "admin" ? "default" : "outline"}
                size="default"
                onClick={() => onRoleFilterChange(roleFilter === "admin" ? "all" : "admin")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Admins ({adminCount})
              </Button>
              <Button
                variant={roleFilter === "user" ? "default" : "outline"}
                size="default"
                onClick={() => onRoleFilterChange(roleFilter === "user" ? "all" : "user")}
              >
                <User className="w-4 h-4 mr-2" />
                Users ({userCount})
              </Button>
              <Button
                variant={roleFilter === "buyer" ? "default" : "outline"}
                size="default"
                onClick={() => onRoleFilterChange(roleFilter === "buyer" ? "all" : "buyer")}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Buyers ({buyerCount})
              </Button>
              <Button
                variant={roleFilter === "seller" ? "default" : "outline"}
                size="default"
                onClick={() => onRoleFilterChange(roleFilter === "seller" ? "all" : "seller")}
              >
                <Store className="w-4 h-4 mr-2" />
                Sellers ({sellerCount})
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="default" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>List of all users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "No users in the system"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email Verified</TableHead>
                  <TableHead>Sync History</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || "N/A"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : user.role === "buyer" ? (
                          <>
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Buyer
                          </>
                        ) : user.role === "seller" ? (
                          <>
                            <Store className="w-3 h-3 mr-1" />
                            Seller
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            User
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.syncHistoryCount || 0} syncs</div>
                    </TableCell>
                    <TableCell>
                      {user.latestSync ? (
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(user.latestSync.timestamp), "MMM d, yyyy")}
                          <br />
                          <Badge variant="outline" className="text-xs mt-1">
                            {user.latestSync.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="text-xs text-muted-foreground">
                Showing {users.length} user{users.length === 1 ? "" : "s"}.
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={50}
      />
    </div>
  );
}

