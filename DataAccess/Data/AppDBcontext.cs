using DataAccess.models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DataAccess
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Document> Documents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // This MUST be called first
            base.OnModelCreating(modelBuilder);

            // Configure Identity tables (optional)
            modelBuilder.Entity<ApplicationUser>(b =>
            {
                // Configure user if needed
            });

            modelBuilder.Entity<IdentityUserClaim<string>>(b =>
            {
                // Configure claims if needed
            });

            modelBuilder.Entity<IdentityUserLogin<string>>(b =>
            {
                b.HasKey(l => new { l.LoginProvider, l.ProviderKey });
            });

            modelBuilder.Entity<IdentityUserToken<string>>(b =>
            {
                b.HasKey(t => new { t.UserId, t.LoginProvider, t.Name });
            });

            // Configure your Document entity
            modelBuilder.Entity<Document>(entity =>
            {
                entity.HasKey(d => d.Id); // Make sure you have a primary key
                // Other configurations...
            });
        }
    }
}