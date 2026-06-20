#!/usr/bin/env bash
pip install -r requirements.txt
python -m app.seed
python -m app.seed_questions
