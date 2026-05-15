namespace MetroBeezFMS.Domain;

public abstract class AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? UpdatedBy { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}

public abstract class SoftDeletableEntity : AuditableEntity
{
    public string? DeletedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public bool IsDeleted { get; set; }
}

public static class Roles
{
    public const string OwnerAdmin = "Owner/Admin";
    public const string Manager = "Manager";
    public const string Driver = "Driver";
    public const string Viewer = "Viewer";
}
