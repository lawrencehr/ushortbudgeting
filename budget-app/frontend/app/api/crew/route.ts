import { NextResponse } from "next/server";

/* eslint-disable no-var */
declare global {
    var MOCK_CREW_DB: any[];
}
/* eslint-enable no-var */

if (!global.MOCK_CREW_DB) {
    global.MOCK_CREW_DB = [
        {
            id: "1",
            name: "John Doe",
            role: "Gaffer",
            base_rate: 550,
            default_allowances: [
                { name: "Meal Money", amount: 25, frequency: "day" }
            ]
        },
        {
            id: "2",
            name: "Jane Smith",
            role: "Best Boy",
            base_rate: 450,
            default_allowances: []
        }
    ];
}

export async function GET() {
    return NextResponse.json(global.MOCK_CREW_DB);
}

export async function POST(request: Request) {
    const body = await request.json();
    const newMember = {
        ...body,
        id: Math.random().toString(36).substring(7), // Simple mock ID
    };
    global.MOCK_CREW_DB.push(newMember);
    return NextResponse.json(newMember);
}
