export const USER_REGISTERED = 'UserRegistered';

export const USER_REGISTERED_VERSION = 1;

export type UserRegisteredEvent = {
    eventId: string;
    type: typeof USER_REGISTERED;
    version: typeof USER_REGISTERED_VERSION;
    userId: number;
    occurredAt: Date;
};

export interface EventDelivery {
    deliver(event: UserRegisteredEvent): Promise<void>;
}
