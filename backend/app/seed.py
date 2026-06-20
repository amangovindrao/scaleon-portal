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
    (models.RoleSlug.ai_agent_developer, "AI Agent Developer",
     "Builds and ships AI agents, LLM-powered tools, and automation pipelines."),
    (models.RoleSlug.project_management, "Project Management",
     "Plans, coordinates, and drives execution across Growth and Tech teams."),
    (models.RoleSlug.social_media_marketing, "Social Media Marketing",
     "Creates and scales content, campaigns, and brand presence across platforms."),
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

# ---------- Sample questions ----------
# Format: (section, prompt, a, b, c, d, correct)
common_aptitude = [
    (models.Section.aptitude, "If a train covers 60 km in 45 minutes, what is its speed in km/h?",
     "75 km/h", "80 km/h", "90 km/h", "70 km/h", "a"),
    (models.Section.aptitude, "Find the next number in the series: 2, 6, 12, 20, 30, ?",
     "40", "42", "44", "36", "b"),
    (models.Section.aptitude, "A is twice as old as B. 5 years ago, A was 3 times as old as B. What is B's current age?",
     "10", "15", "20", "25", "a"),
    (models.Section.aptitude, "Choose the word most similar in meaning to 'Meticulous'.",
     "Careless", "Thorough", "Hasty", "Vague", "b"),
]

role_specific = {
    models.RoleSlug.ai_agent_developer: [
        (models.Section.coding, "What does an LLM 'temperature' parameter primarily control?",
         "Token limit", "Output randomness/creativity", "Model size", "API latency", "b"),
        (models.Section.coding, "In a RAG (Retrieval-Augmented Generation) pipeline, what is typically retrieved before generation?",
         "Random text", "Relevant documents/chunks from a knowledge base", "User credentials", "Model weights", "b"),
        (models.Section.coding, "Which of these is NOT a common vector database used for embeddings?",
         "Pinecone", "Weaviate", "ChromaDB", "PostgreSQL only (no extension)", "d"),
        (models.Section.coding, "What is the primary purpose of a 'system prompt' when working with an LLM API?",
         "To set persistent instructions/behavior for the assistant", "To store user passwords", "To compress the response", "To log errors", "a"),
        (models.Section.coding, "What does 'function calling' / 'tool use' allow an LLM agent to do?",
         "Only generate text", "Invoke external functions/APIs to take real actions", "Train itself", "Delete its own weights", "b"),
        (models.Section.case_study, "Your AI agent is hallucinating facts when answering customer queries. What's the MOST effective first fix?",
         "Increase the temperature", "Add retrieval-augmented generation with verified source documents", "Make responses longer", "Switch to a smaller model", "b"),
        (models.Section.case_study, "A client wants an AI agent that books meetings, sends emails, and updates a CRM. What architecture pattern fits best?",
         "A single prompt with no tools", "An agent with multiple tool integrations and an orchestration loop", "A static FAQ chatbot", "A pre-recorded video", "b"),
        (models.Section.case_study, "Your agent's API costs are spiking in production. What's a practical mitigation?",
         "Ignore it", "Cache repeated queries and use a smaller model for simple tasks", "Increase max tokens for every call", "Remove all logging", "b"),
    ],
    models.RoleSlug.project_management: [
        (models.Section.coding, "In Agile, what is the primary purpose of a sprint retrospective?",
         "To assign blame", "To reflect on what went well/poorly and improve the next sprint", "To plan the next 6 months", "To fire underperformers", "b"),
        (models.Section.coding, "What does 'scope creep' refer to in project management?",
         "Reducing project scope to save time", "Uncontrolled expansion of project requirements without adjusting resources/timeline", "A type of Gantt chart", "A QA testing method", "b"),
        (models.Section.coding, "Which tool is most associated with visualizing task dependencies and timelines?",
         "Gantt chart", "Pie chart", "Heat map", "Word cloud", "a"),
        (models.Section.coding, "What is a 'critical path' in project scheduling?",
         "The shortest possible task list", "The sequence of dependent tasks that determines the minimum project duration", "A backup plan", "An unused task", "b"),
        (models.Section.coding, "In RACI matrices, what does the 'A' stand for?",
         "Approved", "Accountable", "Assigned", "Active", "b"),
        (models.Section.case_study, "Two team members disagree on priority of tasks, delaying delivery. What should a PM do first?",
         "Ignore it and hope it resolves", "Facilitate a discussion to align on priorities against project goals", "Escalate immediately to leadership", "Remove one team member from the project", "b"),
        (models.Section.case_study, "A project is 2 weeks behind schedule with the deadline fixed. What's the most balanced response?",
         "Work the team overtime indefinitely", "Reassess scope/resources and communicate trade-offs to stakeholders", "Ship it broken on time", "Cancel the project", "b"),
        (models.Section.case_study, "A stakeholder keeps requesting new features mid-sprint. How should this be handled?",
         "Accept every request immediately", "Log requests, evaluate impact, and route through a change-control process", "Refuse to talk to the stakeholder", "Delay the entire project", "b"),
    ],
    models.RoleSlug.social_media_marketing: [
        (models.Section.coding, "What does 'engagement rate' typically measure on social media?",
         "Follower count only", "Interactions (likes/comments/shares) relative to reach or followers", "Number of posts per day", "Ad spend", "b"),
        (models.Section.coding, "Which metric best indicates if a Reel is retaining viewers?",
         "Watch time / average view duration", "Profile picture clicks", "Username length", "Hashtag count", "a"),
        (models.Section.coding, "What is 'A/B testing' used for in a content/marketing context?",
         "Testing two versions of content to see which performs better", "Backing up content", "Translating content", "Scheduling posts only", "a"),
        (models.Section.coding, "What does 'organic reach' mean?",
         "Reach gained through paid ads only", "Reach gained without paid promotion", "Reach from bots", "Reach measured in km", "b"),
        (models.Section.coding, "For GenZ Hinglish content, which factor most affects shareability?",
         "Formal corporate tone", "Relatable, authentic storytelling with cultural relevance", "Long captions only", "No visuals", "b"),
        (models.Section.case_study, "A reel underperforms despite good production quality. What should you check first?",
         "Delete it immediately", "Hook (first 3 seconds), posting time, and audience relevance", "Switch platforms entirely", "Increase video length to 10 minutes", "b"),
        (models.Section.case_study, "A brand campaign gets negative comments going viral. What's the right first move?",
         "Delete all comments and ignore it", "Acknowledge the issue publicly, respond calmly, and address it transparently", "Disable comments forever", "Blame the audience", "b"),
        (models.Section.case_study, "You have a limited budget but need to grow reach for a new product launch. What's the most effective approach?",
         "Spend everything on one platform ad", "Mix organic creator/influencer collabs with small targeted paid boosts", "Only post once and wait", "Buy fake followers", "b"),
    ],
}

for slug, role in role_objs.items():
    existing_count = db.query(models.Question).filter(models.Question.role_id == role.id).count()
    if existing_count > 0:
        continue  # don't duplicate on re-run
    idx = 0
    for section, prompt, a, b, c, d, correct in common_aptitude:
        db.add(models.Question(
            role_id=role.id, section=section, prompt=prompt,
            option_a=a, option_b=b, option_c=c, option_d=d,
            correct_option=correct, points=1, order_index=idx,
        ))
        idx += 1
    for section, prompt, a, b, c, d, correct in role_specific[slug]:
        db.add(models.Question(
            role_id=role.id, section=section, prompt=prompt,
            option_a=a, option_b=b, option_c=c, option_d=d,
            correct_option=correct, points=1, order_index=idx,
        ))
        idx += 1
    print(f"Seeded {idx} questions for {role.name}")

db.commit()
db.close()
print("\nSeed complete. Sample candidate logins you can create via the admin panel,")
print("or insert directly — see README for instructions.")
