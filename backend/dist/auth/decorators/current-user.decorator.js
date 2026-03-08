"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentTenant = exports.currentTenantFactory = exports.CurrentUser = exports.currentUserFactory = void 0;
const common_1 = require("@nestjs/common");
const currentUserFactory = (data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
        return null;
    }
    if (data) {
        return user[data];
    }
    return user;
};
exports.currentUserFactory = currentUserFactory;
exports.CurrentUser = (0, common_1.createParamDecorator)(exports.currentUserFactory);
const currentTenantFactory = (data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.tenantId;
};
exports.currentTenantFactory = currentTenantFactory;
exports.CurrentTenant = (0, common_1.createParamDecorator)(exports.currentTenantFactory);
