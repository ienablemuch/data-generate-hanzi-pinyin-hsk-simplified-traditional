import { ICorrection } from "./interfaces.ts";

import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";

export async function generateCorrectionFile(correction: ICorrection) {
    await writeJson("./lookup-correction", correction);
}
