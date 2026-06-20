"""
Seed script: 50 aptitude questions for ALL roles.

This script:
1. Removes ALL existing questions from the database.
2. Inserts 50 aptitude questions (section='aptitude') for every role.

Usage:
    cd backend
    python -m app.seed_questions
"""
from .database import SessionLocal, engine, Base
from . import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ---------- Remove ALL existing questions ----------
deleted = db.query(models.Question).delete()
db.commit()
print(f"Deleted {deleted} existing question(s).")

# ---------- 50 Aptitude Questions ----------
# Format: (prompt, option_a, option_b, option_c, option_d, correct_option)
QUESTIONS = [
    # 1-25: Percentage, Profit/Loss, Ratio, Average, SI/CI
    (
        "If 75% of a number is added to 75, the result equals the number itself. Find 40% of that number.",
        "40", "60", "80", "120", "c"
    ),
    (
        "A's salary is 25% more than B's salary. B's salary is what percent less than A's salary?",
        "20%", "25%", "30%", "33.33%", "a"
    ),
    (
        "A shopkeeper increases the price of a product by 20%, but sales decrease by 10%. What is the percentage change in revenue?",
        "8% Increase", "10% Increase", "12% Increase", "No Change", "a"
    ),
    (
        "The population of a town increases by 5% annually. Current population is 9261. What was the population 3 years ago?",
        "7000", "8000", "8500", "9000", "b"
    ),
    (
        "A candidate scored 20% marks and failed by 30 marks. Another scored 32% and got 42 marks above passing marks. Find the passing percentage.",
        "22%", "24%", "25%", "28%", "c"
    ),
    (
        "A shopkeeper marks an article 25% above cost price and gives a 10% discount. Profit percentage?",
        "10%", "12.5%", "15%", "20%", "b"
    ),
    (
        "An article is sold at a loss of 10%. Had it been sold for ₹90 more, a profit of 5% would have been earned. Cost price is:",
        "₹500", "₹600", "₹720", "₹800", "b"
    ),
    (
        "A trader buys 40 articles for ₹1200 and sells each at ₹40. Profit percentage?",
        "25%", "30%", "33.33%", "40%", "c"
    ),
    (
        "Successive discounts of 20% and 10% are equivalent to:",
        "28%", "30%", "32%", "35%", "a"
    ),
    (
        "A product is sold at 20% profit. If the cost price increases by 10% but selling price remains same, profit becomes:",
        "8%", "9.09%", "10%", "12%", "b"
    ),
    (
        "The ratio of boys and girls is 5:4. If total students are 180, number of girls is:",
        "70", "80", "90", "100", "b"
    ),
    (
        "A:B = 3:4 and B:C = 2:5. Find A:C.",
        "3:10", "6:20", "3:8", "4:9", "a"
    ),
    (
        "If x:y = 5:7 and y:z = 3:4, then x:y:z =",
        "15:21:28", "10:14:16", "5:7:4", "15:7:28", "a"
    ),
    (
        "The ratio of incomes of A and B is 9:7. If A earns ₹9000 more than B, find B's income.",
        "₹21000", "₹24000", "₹31500", "₹35000", "c"
    ),
    (
        "A sum is divided among A, B and C in ratio 2:3:5. If C gets ₹5000, total sum is:",
        "₹8000", "₹10000", "₹12000", "₹15000", "b"
    ),
    (
        "Average of 10 numbers is 45. If one number is removed, average becomes 43. Find removed number.",
        "53", "60", "63", "65", "c"
    ),
    (
        "The average age of 20 students is 18 years. One student aged 22 leaves and another joins. Average becomes 17.8. Age of new student?",
        "16", "17", "18", "19", "c"
    ),
    (
        "A vessel contains milk and water in ratio 3:2. 10 liters mixture is removed and replaced by water. Ratio becomes 1:1. Original quantity?",
        "40 L", "50 L", "60 L", "80 L", "b"
    ),
    (
        "Average of first 20 natural numbers is:",
        "10", "10.5", "11", "12", "b"
    ),
    (
        "A mixture contains milk and water in ratio 5:3. How much water should be added to make ratio 5:5?",
        "20%", "30%", "40%", "50%", "c"
    ),
    (
        "Simple interest on ₹5000 at 10% for 3 years:",
        "₹1200", "₹1400", "₹1500", "₹1800", "c"
    ),
    (
        "Compound interest on ₹10000 at 10% for 2 years:",
        "₹2000", "₹2100", "₹2200", "₹2400", "b"
    ),
    (
        "Difference between CI and SI on ₹2000 at 10% for 2 years:",
        "₹10", "₹20", "₹25", "₹30", "b"
    ),
    (
        "A sum doubles in 8 years at simple interest. In how many years will it become four times?",
        "16", "20", "24", "32", "c"
    ),
    (
        "At what rate will ₹5000 become ₹6050 in 2 years under simple interest?",
        "9%", "10%", "10.5%", "11%", "c"
    ),
    # 26-50: Probability, Time/Work, Speed/Distance, DI, Reasoning
    (
        "A bag contains 5 red, 4 blue, and 3 green balls. What is the probability of drawing a blue ball?",
        "1/4", "1/3", "4/12", "5/12", "b"
    ),
    (
        "Two dice are rolled simultaneously. What is the probability that the sum is 7?",
        "1/12", "1/6", "5/36", "7/36", "b"
    ),
    (
        "A card is drawn from a standard deck. Probability of getting a King?",
        "1/13", "1/26", "1/52", "4/13", "a"
    ),
    (
        "A coin is tossed three times. Probability of getting exactly two heads?",
        "1/8", "2/8", "3/8", "4/8", "c"
    ),
    (
        "Probability of selecting a vowel from the word 'INTERNSHIP'?",
        "2/10", "3/10", "4/10", "5/10", "b"
    ),
    (
        "A can complete a work in 15 days and B in 10 days. Together they can complete it in:",
        "5 days", "6 days", "7 days", "8 days", "b"
    ),
    (
        "A alone completes a task in 20 days. B is 25% more efficient than A. B alone can complete it in:",
        "15 days", "16 days", "18 days", "20 days", "b"
    ),
    (
        "12 workers complete a task in 18 days. How many workers are needed to complete it in 12 days?",
        "15", "18", "20", "24", "b"
    ),
    (
        "Pipe A fills a tank in 12 hours and Pipe B in 18 hours. Together they fill the tank in:",
        "6.2 hrs", "7.2 hrs", "8 hrs", "9 hrs", "b"
    ),
    (
        "A can do a piece of work in 30 days. After working 10 days, B joins and they finish in another 10 days. B alone can do the work in:",
        "20 days", "30 days", "40 days", "60 days", "b"
    ),
    (
        "A train travels 360 km in 6 hours. Its speed is:",
        "50 km/h", "55 km/h", "60 km/h", "65 km/h", "c"
    ),
    (
        "A train 200m long passes a pole in 10 seconds. Speed?",
        "54 km/h", "60 km/h", "72 km/h", "80 km/h", "c"
    ),
    (
        "A train 180m long crosses a platform 220m long in 20 seconds. Speed?",
        "54 km/h", "60 km/h", "72 km/h", "80 km/h", "c"
    ),
    (
        "Two trains move in opposite directions at 54 km/h and 36 km/h. Relative speed?",
        "72 km/h", "80 km/h", "90 km/h", "100 km/h", "c"
    ),
    (
        "A car travels at 60 km/h. How much distance will it cover in 2.5 hours?",
        "120 km", "130 km", "150 km", "180 km", "c"
    ),
    (
        "Monthly sales (₹ Lakhs): Jan=20, Feb=25, Mar=30, Apr=35, May=40. Total sales from Jan to May?",
        "130", "140", "150", "160", "c"
    ),
    (
        "Monthly sales (₹ Lakhs): Jan=20, Feb=25, Mar=30, Apr=35, May=40. Average monthly sales?",
        "28", "30", "32", "35", "b"
    ),
    (
        "Monthly sales (₹ Lakhs): Jan=20, Feb=25, Mar=30, Apr=35, May=40. Percentage increase from January to May?",
        "80%", "90%", "100%", "120%", "c"
    ),
    (
        "Monthly sales (₹ Lakhs): Jan=20, Feb=25, Mar=30, Apr=35, May=40. In which month was sales highest?",
        "March", "April", "May", "February", "c"
    ),
    (
        "Monthly sales (₹ Lakhs): Jan=20, Feb=25, Mar=30, Apr=35, May=40. Difference between April and February sales?",
        "5", "8", "10", "12", "c"
    ),
    (
        "Pointing to a woman, Aman says: 'She is the daughter of my grandfather's only son.' Who is she?",
        "Sister", "Mother", "Daughter", "Cousin", "a"
    ),
    (
        "If SCALE is coded as TDBMF, then WORK is coded as:",
        "XPSL", "XPSK", "XPQL", "YPSL", "b"
    ),
    (
        "A person walks 10m North, then 10m East, then 10m South. Where is he from the starting point?",
        "10m North", "10m East", "10m West", "Starting Point", "b"
    ),
    (
        "Statements: All engineers are graduates. Some graduates are researchers. Conclusion: I. Some engineers are researchers. II. All engineers are graduates.",
        "Only I follows", "Only II follows", "Both follow", "Neither follows", "b"
    ),
    (
        "In a class of 40 students, Rahul ranks 12th from the top. What is his rank from the bottom?",
        "27th", "28th", "29th", "30th", "c"
    ),
]

# ---------- Get all roles ----------
roles = db.query(models.Role).all()
if not roles:
    print("ERROR: No roles found. Run the main seed first: python -m app.seed")
    db.close()
    exit(1)

print(f"Found {len(roles)} role(s): {[r.name for r in roles]}")
print(f"Seeding {len(QUESTIONS)} aptitude questions for each role...\n")

# ---------- Insert questions for each role ----------
for role in roles:
    for idx, (prompt, opt_a, opt_b, opt_c, opt_d, correct) in enumerate(QUESTIONS):
        db.add(models.Question(
            role_id=role.id,
            section=models.Section.aptitude,
            prompt=prompt,
            option_a=opt_a,
            option_b=opt_b,
            option_c=opt_c,
            option_d=opt_d,
            correct_option=correct,
            points=1,
            order_index=idx + 1,
        ))
    print(f"  ✓ Inserted {len(QUESTIONS)} questions for role: {role.name}")

db.commit()
db.close()
print(f"\nSeed complete. {len(QUESTIONS) * len(roles)} total questions inserted.")
