import type { Config } from '../config/index.js';
import { BuildError } from '../internal/errors.js';
import type { Logger } from '../internal/logger.js';
import type { Options } from '../internal/options.js';
import type { DatabaseConfig } from '../internal/types.js';
export declare function buildPre({ config, options, logger, }: {
    config: Config;
    options: Pick<Options, "rootDir" | "ponderDir">;
    logger: Logger;
}): {
    databaseConfig: DatabaseConfig;
    ordering: NonNullable<Config["ordering"]>;
};
export declare function safeBuildPre({ config, options, logger, }: {
    config: Config;
    options: Pick<Options, "rootDir" | "ponderDir">;
    logger: Logger;
}): {
    readonly status: "success";
    readonly databaseConfig: DatabaseConfig;
    readonly ordering: NonNullable<"omnichain" | "multichain" | "experimental_isolated" | undefined>;
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
    readonly databaseConfig?: undefined;
    readonly ordering?: undefined;
};
//# sourceMappingURL=pre.d.ts.map