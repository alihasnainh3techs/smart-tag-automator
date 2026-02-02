-- CreateTable
CREATE TABLE `activitylog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `ruleId` INTEGER NULL,
    `status` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    `productsUpdated` INTEGER NOT NULL DEFAULT 0,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_ruleId_fkey`(`ruleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `lastBulkOperationId` VARCHAR(191) NULL,
    `ruleName` VARCHAR(191) NOT NULL,
    `matchType` ENUM('AND', 'OR') NOT NULL DEFAULT 'AND',
    `taggingBehavior` ENUM('ADD', 'REPLACE') NOT NULL DEFAULT 'ADD',
    `autoRemoveTags` BOOLEAN NOT NULL DEFAULT false,
    `conditions` LONGTEXT NOT NULL,
    `tags` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,
    `totalAppliedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Rule_shop_ruleName_idx`(`shop`, `ruleName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` VARCHAR(191) NULL,
    `refreshTokenExpires` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `tagPrefix` VARCHAR(191) NULL,
    `appStatus` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhooklog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `ruleId` INTEGER NULL,
    `productId` VARCHAR(191) NOT NULL,
    `triggerType` ENUM('CREATE', 'UPDATE') NOT NULL DEFAULT 'CREATE',
    `appliedTags` LONGTEXT NULL,
    `status` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    `reason` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookLog_productId_idx`(`productId`),
    INDEX `WebhookLog_ruleId_fkey`(`ruleId`),
    INDEX `WebhookLog_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activitylog` ADD CONSTRAINT `ActivityLog_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `rule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhooklog` ADD CONSTRAINT `WebhookLog_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `rule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
