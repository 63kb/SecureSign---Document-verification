using Microsoft.EntityFrameworkCore;

namespace DataAccess.Models
{
    public class AppDbContext : IdentityDbContext<IdentityUser>
    {
        public DbSet<Document> Documents { get; set; }
        public DbSet<DocumentPermission> DocumentPermissions { get; set; } // Add this line

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships for DocumentPermission if needed
            modelBuilder.Entity<DocumentPermission>()
                .HasOne(dp => dp.Document)
                .WithMany()
                .HasForeignKey(dp => dp.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
