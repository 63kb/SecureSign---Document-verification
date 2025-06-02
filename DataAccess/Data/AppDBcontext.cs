using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using DataAccess.models; // Your models namespace

namespace DataAccess
{
    public class AppDbContext : IdentityDbContext<IdentityUser>
    {
        // Correct constructor
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) // Proper base call
        {
        }

        public DbSet<Document> Documents { get; set; }
        public DbSet<DocumentPermission> DocumentPermissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Must call base first
            base.OnModelCreating(modelBuilder);

            // Your custom configurations
            modelBuilder.Entity<Document>()
                .HasMany(d => d.Permissions)
                .WithOne(p => p.Document)
                .HasForeignKey(p => p.DocumentId);
        }
    }
}