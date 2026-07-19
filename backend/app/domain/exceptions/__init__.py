class DomainException(Exception):
    """Base exception for all domain logic rules."""
    def __init__(self, message: str, error_code: str = "DOMAIN_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code


class UserAlreadyExistsException(DomainException):
    def __init__(self, message: str = "Username or Email already registered"):
        super().__init__(
            message=message,
            error_code="USER_ALREADY_EXISTS",
            status_code=400
        )


class InvalidCredentialsException(DomainException):
    def __init__(self, message: str = "Incorrect email or password"):
        super().__init__(
            message=message,
            error_code="INVALID_CREDENTIALS",
            status_code=401
        )


class TokenExpiredException(DomainException):
    def __init__(self, message: str = "Access token has expired"):
        super().__init__(
            message=message,
            error_code="TOKEN_EXPIRED",
            status_code=401
        )


class TokenInvalidException(DomainException):
    def __init__(self, message: str = "Token is invalid or corrupted"):
        super().__init__(
            message=message,
            error_code="TOKEN_INVALID",
            status_code=401
        )


class RoomNotFoundException(DomainException):
    def __init__(self, message: str = "Room not found"):
        super().__init__(
            message=message,
            error_code="ROOM_NOT_FOUND",
            status_code=404
        )


class UnauthorizedException(DomainException):
    def __init__(self, message: str = "Not authorized to perform this operation"):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=403
        )


class UserSuspendedException(DomainException):
    def __init__(self, message: str = "User account has been suspended"):
        super().__init__(
            message=message,
            error_code="USER_SUSPENDED",
            status_code=403
        )
