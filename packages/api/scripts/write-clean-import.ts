import { cleanBook } from "../src/sample/import-template/import-fixture.ts";

const book = await cleanBook();
const buffer = await book.xlsx.writeBuffer();
console.log(Buffer.from(buffer).toString("base64"));
