from app.db.base import Base
from app.models import *

print("OK: All models imported successfully\n")
print(f"Total Models Registered: {len(Base.registry.mappers)}\n")
print("Registered Models:")
for mapper in Base.registry.mappers:
    print(f"  - {mapper.class_.__name__} -> {mapper.class_.__tablename__}")
