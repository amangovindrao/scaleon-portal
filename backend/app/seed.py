"""
Run this once to set up the database with:
- 1 admin account (email: admin@thescaleon.com / password: scaleon@admin123)
- 3 roles
- A handful of sample MCQ questions per role per section, so you can test
  the full flow end-to-end immediately. Replace these with your real
  question bank via the admin panel whenever you're ready.

Usage:
    cd backend
    python -m app.seed
"""
from .database import SessionLocal, engine, Base
from . import models, auth

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ---------- Admin ----------
if not db.query(models.Admin).filter(models.Admin.email == "admin@thescaleon.com").first():
    db.add(models.Admin(
        name="theScaleOn Admin",
        email="admin@thescaleon.com",
        hashed_password=auth.hash_password("scaleon@admin123"),
    ))
    db.commit()
    print("Created admin: admin@thescaleon.com / scaleon@admin123")

# ---------- Roles ----------
roles_data = [
    (models.RoleSlug.technical, "Technical",
     "Software development, AI/ML, data science, and engineering roles."),
    (models.RoleSlug.marketing, "Marketing",
     "Social media, content creation, brand management, and growth roles."),
]
role_objs = {}
for slug, name, desc in roles_data:
    existing = db.query(models.Role).filter(models.Role.slug == slug).first()
    if not existing:
        existing = models.Role(slug=slug, name=name, description=desc)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        print(f"Created role: {name}")
    role_objs[slug] = existing

db.commit()
db.close()
print("\nSeed complete. Now run: python -m app.seed_questions")
