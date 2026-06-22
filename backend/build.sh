#!/usr/bin/env bash
pip install -r requirements.txt
python3 -c "
from app.database import engine, Base
from app import models
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print('DB recreated')
"
python3 -m app.seed
python3 -m app.seed_questions
