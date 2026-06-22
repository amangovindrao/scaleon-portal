"""
Seed script: 50 aptitude questions for ALL roles.
Usage: cd backend && python -m app.seed_questions
"""
from .database import SessionLocal, engine, Base
from . import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

deleted = db.query(models.Question).delete()
db.commit()
print(f"Deleted {deleted} existing question(s).")

# (prompt, option_a, option_b, option_c, option_d, correct_option)
QUESTIONS = [
    # 1-5: Percentage
    ("A student's marks increased from 480 to 600. What is the percentage increase?",
     "20%", "25%", "30%", "35%", "b"),
    ("A shopkeeper increases the price of a product by 25% and later gives a 20% discount. What is the net effect on the price?",
     "No change", "5% increase", "5% decrease", "10% increase", "a"),
    ("If 40% of a number is 96, what is the number?",
     "220", "230", "240", "250", "c"),
    ("The population of a town increases by 10% every year. If the current population is 24,200, what was it one year ago?",
     "20,000", "21,000", "22,000", "22,500", "c"),
    ("A candidate scores 360 marks out of 450. What percentage did he score?",
     "75%", "78%", "80%", "82%", "c"),
    # 6-10: Profit and Loss
    ("A shopkeeper buys an article for ₹800 and sells it for ₹920. Find the profit percentage.",
     "12%", "15%", "18%", "20%", "b"),
    ("An article is sold for ₹540 at a 10% loss. What is its cost price?",
     "₹580", "₹600", "₹620", "₹640", "b"),
    ("The marked price of an item is ₹1500. A discount of 20% is offered. Find the selling price.",
     "₹1000", "₹1100", "₹1200", "₹1300", "c"),
    ("Successive discounts of 10% and 20% are equal to a single discount of:",
     "28%", "30%", "26%", "32%", "a"),
    ("An article is sold at 25% profit for ₹1250. Find its cost price.",
     "₹950", "₹980", "₹1000", "₹1050", "c"),
    # 11-15: Ratio and Proportion
    ("The ratio of boys to girls in a class is 5:3. If there are 40 students, how many are girls?",
     "12", "15", "18", "20", "b"),
    ("Divide ₹900 among A, B, and C in the ratio 2:3:4.",
     "₹200, ₹300, ₹400", "₹180, ₹270, ₹450", "₹250, ₹300, ₹350", "₹150, ₹300, ₹450", "a"),
    ("If A:B = 4:7 and B = 56, find A.",
     "28", "30", "32", "36", "c"),
    ("The ages of two persons are in the ratio 3:5. If their sum is 64 years, the elder person's age is:",
     "36", "38", "40", "42", "c"),
    ("Milk and water are mixed in the ratio 5:2. If the total mixture is 28 litres, how much water is present?",
     "6 litres", "8 litres", "10 litres", "12 litres", "b"),
    # 16-20: Time and Work
    ("A can complete a work in 12 days and B in 18 days. Together they can complete the work in:",
     "6 days", "7.2 days", "8 days", "9 days", "b"),
    ("A can do a work in 20 days. B can do the same work in 30 days. Working together, they finish the work in:",
     "10 days", "12 days", "15 days", "18 days", "b"),
    ("If 8 men complete a work in 15 days, how many men are required to complete the same work in 10 days?",
     "10", "12", "14", "15", "b"),
    ("A is twice as efficient as B. If B completes a work in 18 days, A alone will complete it in:",
     "6 days", "8 days", "9 days", "12 days", "c"),
    ("12 workers can complete a project in 15 days. If 6 more workers join them, in how many days will the work be completed?",
     "8 days", "10 days", "12 days", "14 days", "b"),
    # 21-25: Time, Speed & Distance
    ("A train 180 m long crosses a pole in 12 seconds. What is its speed?",
     "45 km/h", "50 km/h", "54 km/h", "60 km/h", "c"),
    ("A car travels 240 km in 4 hours. What is its average speed?",
     "50 km/h", "55 km/h", "60 km/h", "65 km/h", "c"),
    ("Two trains are moving in opposite directions at 54 km/h and 72 km/h. Find their relative speed.",
     "108 km/h", "116 km/h", "120 km/h", "126 km/h", "d"),
    ("A person walks at 5 km/h and reaches his office 12 minutes late. If he walks at 6 km/h, he reaches 10 minutes early. What is the distance to the office?",
     "5 km", "6 km", "7 km", "8 km", "b"),
    ("A boat moves at 12 km/h in still water. The speed of the stream is 3 km/h. Find its downstream speed.",
     "9 km/h", "12 km/h", "15 km/h", "18 km/h", "c"),
    # 26-30: Simple & Compound Interest
    ("Find the Simple Interest on ₹8000 for 3 years at 10% per annum.",
     "₹2200", "₹2300", "₹2400", "₹2500", "c"),
    ("Find the Compound Interest on ₹10000 for 2 years at 10% per annum.",
     "₹2000", "₹2050", "₹2100", "₹2200", "c"),
    ("What is the difference between SI and CI on ₹5000 for 2 years at 10% p.a.?",
     "₹40", "₹50", "₹60", "₹70", "b"),
    ("At what rate will ₹5000 become ₹6000 in 4 years under Simple Interest?",
     "4%", "5%", "6%", "8%", "b"),
    ("A sum amounts to ₹13200 in 2 years at 10% compound interest. Find the principal.",
     "₹10000", "₹10500", "₹10800", "₹11000", "d"),
    # 31-33: Average
    ("The average of 8 numbers is 25. Find their total.",
     "180", "190", "200", "210", "c"),
    ("The average age of 10 students is 18 years. A teacher aged 38 years joins them. Find the new average.",
     "19 years", "19.5 years", "20 years", "20.5 years", "c"),
    ("The average of five consecutive even numbers is 24. What is the largest number?",
     "26", "28", "30", "32", "b"),
    # 34-36: Number System
    ("Find the HCF of 24, 36 and 60.",
     "6", "8", "12", "24", "c"),
    ("Find the LCM of 12 and 18.",
     "24", "30", "36", "48", "c"),
    ("A number leaves remainder 3 when divided by 7. What remainder will its square leave when divided by 7?",
     "1", "2", "3", "4", "b"),
    # 37-40: Permutation & Combination
    ("In how many ways can 5 people sit in a row?",
     "24", "60", "120", "240", "c"),
    ("How many committees of 3 members can be formed from 8 people?",
     "48", "52", "56", "64", "c"),
    ("How many 4-digit numbers can be formed using 1,2,3,4 without repetition?",
     "12", "18", "24", "36", "c"),
    ("How many different arrangements can be made using the letters of the word MATH?",
     "12", "18", "24", "36", "c"),
    # 41-43: Probability
    ("A fair die is thrown once. What is the probability of getting a prime number?",
     "1/6", "1/3", "1/2", "2/3", "c"),
    ("A card is drawn at random from a standard deck of 52 cards. What is the probability of drawing a King?",
     "1/13", "1/26", "1/52", "4/13", "a"),
    ("Two fair coins are tossed simultaneously. What is the probability of getting exactly one head?",
     "1/4", "1/2", "3/4", "1", "b"),
    # 44-47: Logical Reasoning
    ("Find the next number in the series: 2, 6, 12, 20, 30, ?",
     "36", "40", "42", "44", "c"),
    ("Find the odd one out: Apple, Mango, Banana, Carrot",
     "Apple", "Mango", "Banana", "Carrot", "d"),
    ("If A > B, B > C, and C > D, then who is the smallest?",
     "A", "B", "C", "D", "d"),
    ("Pointing to a woman, Ram said, 'She is the daughter of my grandfather's only son.' Who is the woman?",
     "Sister", "Daughter", "Mother", "Cousin", "a"),
    # 48-49: Data Interpretation
    ("Monthly sales (units): Jan=120, Feb=150, Mar=180, Apr=210. What is the average monthly sales?",
     "155", "160", "165", "170", "c"),
    ("The production of a factory increased from 800 units to 1000 units. What is the percentage increase?",
     "20%", "22%", "25%", "30%", "c"),
    # 50: Clock & Ages
    ("At 3:15, what is the angle between the hour hand and the minute hand?",
     "0°", "7.5°", "15°", "22.5°", "b"),
]

# ---------- Get all roles ----------
roles = db.query(models.Role).all()
if not roles:
    print("ERROR: No roles found. Run: python -m app.seed")
    db.close()
    exit(1)

print(f"Found {len(roles)} role(s): {[r.name for r in roles]}")
print(f"Seeding {len(QUESTIONS)} questions for each role...\n")

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
    print(f"  ✓ {len(QUESTIONS)} questions for: {role.name}")

db.commit()
db.close()
print(f"\nDone. {len(QUESTIONS) * len(roles)} total questions.")
