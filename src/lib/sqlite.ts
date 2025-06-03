import Database from "better-sqlite3";
import bsql3 from "better-sqlite3";

export const keepOpen: boolean = true;
export const dbPath: string = "inimibeep.db";
let database: bsql3.Database = keepOpen ? new bsql3(dbPath) : null;
if (database) {
    database.pragma('journal_mode = WAL');
}
declare const global: IBEEPGlobal;

export async function prepareSQL(fn: (db: bsql3.Database) => Promise<any>) {
    if ((database?.open && !keepOpen) || !database?.open) {
        if (database?.open) {
            global.logger("Closing existing SQL database connection", "info", "SQL");
        }
        database?.close();
        database = new bsql3(dbPath);
        database.pragma('journal_mode = WAL');

    }
    try {
        const result = await fn(database);
        if (!keepOpen) {
            database.close();
            database = null;
        }
        return result;
    }
    catch (error) {
        if (!keepOpen) {
            database.close();
            database = null;
        }
        throw error;
    }

}

export async function closeSQL() {
    if (database?.open) {
        global.logger("Closing SQL database connection", "info", "SQL");
        database.close();
        database = null;
    }
}