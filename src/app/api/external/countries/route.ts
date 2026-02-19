import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.COUNTRIES_CITIES_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const response = await fetch("https://api.countrystatecity.in/v1/countries", {
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
        console.error("Error fetching countries from external API:", error);
        return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 });
    }
}
