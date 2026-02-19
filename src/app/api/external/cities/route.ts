import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const apiKey = process.env.COUNTRIES_CITIES_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const countryCode = searchParams.get("ciso");

        if (!countryCode) {
           
            return NextResponse.json([]);
        }

        const response = await fetch(`https://api.countrystatecity.in/v1/countries/${countryCode}/cities`, {
            headers: {
                "X-CSCAPI-KEY": apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching cities from external API:", error);
        return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
    }
}
