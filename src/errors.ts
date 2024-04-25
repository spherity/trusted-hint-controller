export type ClientType = 'WalletClient' | 'MetaTransactionWalletClient' | 'WalletClient or ReadClient';
export type DelegateAction = 'add' | 'remove';

export class TrustedHintControllerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Correctly set the prototype chain for instances of this custom error class
    // https://stackoverflow.com/questions/76159041/why-do-error-subclasses-invoke-object-setprototypeofthis-in-the-construct
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ClientNotSetError extends TrustedHintControllerError {
  constructor(clientType: ClientType) {
    super(`${clientType} must be set and properly configured.`);
  }
}

export class ClientMisconfiguredError extends TrustedHintControllerError {
  constructor(message: string) {
    super(message);
  }
}

export class NotOwnerError extends TrustedHintControllerError {
  constructor(clientType: ClientType) {
    super(`Provided ${clientType} must be the owner of the namespace.`);
  }
}

export class NotDelegateError extends TrustedHintControllerError {
  constructor(clientType: ClientType) {
    super(`Provided ${clientType} must be a delegate of the namespace.`);
  }
}

export class HintSetError extends TrustedHintControllerError {
  constructor(message: string) {
    super(`Failed to set hint: ${message}`);
  }
}

export class MetaTransactionError extends TrustedHintControllerError {
  constructor(operation: string, message: string) {
    super(`Failed to ${operation} via meta transaction: ${message}`);
  }
}
export class DelegateManagementError extends TrustedHintControllerError {
  constructor(action: DelegateAction, message: string) {
    super(`Failed to ${action} list delegate: ${message}`);
  }
}

export class ListStatusError extends TrustedHintControllerError {
  constructor(message: string) {
    super(`Failed to set list status: ${message}`);
  }
}

export class ListOwnerError extends TrustedHintControllerError {
  constructor(message: string) {
    super(`Failed to set list owner: ${message}`);
  }
}

export class MetadataOperationError extends TrustedHintControllerError {
  constructor(message: string) {
    super(`Failed to set metadata: ${message}`);
  }
}
