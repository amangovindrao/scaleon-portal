#!/usr/bin/env bash
pip install -r requirements.txt
# Only seed if DB doesn't exist yet
python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(bind=engine)
print('DB tables ready')
"
python -m app.seed
python -m app.seed_questions
