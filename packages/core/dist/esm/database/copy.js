import { getColumnCasing } from '../drizzle/kit/index.js';
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import copy from "pg-copy-streams";
const ESCAPE_REGEX = /([\\\b\f\n\r\t\v])/g;
export const getCopyText = (table, rows) => {
    let result = "";
    const columns = Object.entries(getTableColumns(table));
    for (let i = 0; i < rows.length; i++) {
        const isLastRow = i === rows.length - 1;
        const row = rows[i];
        for (let j = 0; j < columns.length; j++) {
            const isLastColumn = j === columns.length - 1;
            const [columnName, column] = columns[j];
            let value = row[columnName];
            if (isLastColumn) {
                if (value === null || value === undefined) {
                    result += "\\N";
                }
                else {
                    if (column.mapToDriverValue !== undefined) {
                        value = column.mapToDriverValue(value);
                        if (value === null || value === undefined) {
                            result += "\\N";
                        }
                        else {
                            result += `${String(value).replace(ESCAPE_REGEX, "\\$1")}`;
                        }
                    }
                }
            }
            else {
                if (value === null || value === undefined) {
                    result += "\\N\t";
                }
                else {
                    if (column.mapToDriverValue !== undefined) {
                        value = column.mapToDriverValue(value);
                    }
                    if (value === null || value === undefined) {
                        result += "\\N\t";
                    }
                    else {
                        result += `${String(value).replace(ESCAPE_REGEX, "\\$1")}\t`;
                    }
                }
            }
        }
        if (isLastRow === false) {
            result += "\n";
        }
    }
    return result;
};
export const executeCopy = async (dialect, client, target, text) => {
    if (dialect === "pglite") {
        await client.query(`COPY ${target} FROM '/dev/blob'`, [], {
            blob: new Blob([text]),
        });
    }
    else {
        const copyStream = client.query(copy.from(`COPY ${target} FROM STDIN`));
        await new Promise((resolve, reject) => {
            copyStream.on("finish", resolve);
            copyStream.on("error", reject);
            copyStream.write(text);
            copyStream.end();
        });
    }
};
export const getQuotedColumnList = (table) => {
    return Object.values(getTableColumns(table))
        .map((col) => `"${getColumnCasing(col, "snake_case")}"`)
        .join(", ");
};
export const getQualifiedTableName = (table) => {
    const schema = getTableConfig(table).schema ?? "public";
    return `"${schema}"."${getTableName(table)}"`;
};
//# sourceMappingURL=copy.js.map