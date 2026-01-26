import { NextResponse } from "next/server";

// We need to access the SAME in-memory DB. 
// In a real serverless env, this wouldn't work (need DB), but for local Next.js dev server, 
// usually this module cache *might* persist if we import it, but route files might reload.
// For a better mock, we should ideally use a global var or singleton file.
// Let's rely on a shared mock file if needed, but for now, since we can't easily share state 
// across route files without a dedicated module, let's TRY to redefine it here but it WON'T share state 
// with the POST route effectively if they are separate modules reloaded.
// A better simple hack for "Mock" persistent state in dev: globalThis.

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

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const body = await request.json();
    const index = global.MOCK_CREW_DB.findIndex((c) => c.id === params.id);

    if (index === -1) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    global.MOCK_CREW_DB[index] = { ...global.MOCK_CREW_DB[index], ...body };
    return NextResponse.json(global.MOCK_CREW_DB[index]);
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const index = global.MOCK_CREW_DB.findIndex((c) => c.id === params.id);
    if (index !== -1) {
        global.MOCK_CREW_DB.splice(index, 1);
    }
    return NextResponse.json({ success: true });
}
