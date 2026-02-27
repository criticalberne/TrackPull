# Club Delivery Analysis

**Skill Level:** Advanced
**Goal:** Evaluate your attack angle, dynamic loft, and low point data to understand your delivery pattern and identify efficiency improvements.

## How to Use

1. Export your CSV from TrackPull
2. Open ChatGPT or Claude and either:
   - **Drag and drop** your CSV file into the chat window (easiest), or
   - **Paste** your CSV data directly into the prompt where indicated
3. Copy the prompt below and send it along with your data

---

```
I want a detailed analysis of my club delivery using launch monitor data. Please evaluate:

1. **Attack Angle Progression:** Calculate my average attack angle for each club. Verify the expected pattern: negative (downward) for irons getting steeper with shorter clubs, and positive (upward) for driver. Flag any clubs that break this pattern.

2. **Dynamic Loft vs Static Loft:** Using my launch angle and spin data, estimate whether I'm adding or reducing loft at impact compared to the club's static loft. Am I flipping (adding loft) or de-lofting effectively?

3. **Spin Loft Analysis:** Spin loft = dynamic loft minus attack angle. Calculate this for each club. High spin loft means inefficient energy transfer (high spin, less ball speed). Identify clubs where my spin loft is costing me distance.

4. **Low Point Control:** If low point data is available, evaluate consistency. A forward low point (2-4 inches ahead of the ball for irons) indicates good compression. Inconsistent low point = inconsistent strike.

5. **Impact Location:** If impact height/offset data is available, identify any patterns (toe hits, heel hits, thin, fat).

6. **Overall Delivery Assessment:** Rate my delivery pattern and suggest the 2-3 highest-impact changes I could make to improve ball striking efficiency.

Present key findings in a summary table: Club | Attack Angle | Est. Dynamic Loft | Spin Loft | Low Point | Assessment

My shot data is included below (or attached as a CSV file).
```

---

## Tips for Reading the Response

- **Attack angle** should get progressively steeper from driver (positive) through wedges (most negative)
- **Spin loft** is the efficiency metric — lower spin loft (within reason) means more ball speed and less spin. Tour average driver spin loft is around 14-16°
- **Low point** forward of the ball = compression and consistency; behind the ball = fat shots and thin misses
- If your dynamic loft is close to or above the static loft of the club, you're likely adding loft through impact (casting/flipping)
- Consistent delivery patterns matter more than perfect numbers — low standard deviation is the goal
