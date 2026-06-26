/**
 * FarmScore scoring engine
 * Calculates a credit readiness score from farmer input data.
 * Four dimensions, each out of 25, plus an experience bonus.
 */

function calculateScore(data) {
  const {
    timing, inputs = [], fertRate, yield: yieldLevel, loss,
    advisory, follow, coop, prevLoan, seasons = 1
  } = data;

  // ── 1. Agronomic practice (max 25) ──────────────────────────────────────────
  let agrScore = 0;
  if (timing === 'on-time') agrScore += 10;
  else if (timing === 'early') agrScore += 7;
  else if (timing === 'late') agrScore += 3;
  // missed = 0

  const inputCount = inputs.filter(i => i !== 'none').length;
  agrScore += Math.min(inputCount * 3, 12);

  if (fertRate === 'correct') agrScore += 3;
  agrScore = Math.min(agrScore, 25);

  // ── 2. Production & yield (max 25) ──────────────────────────────────────────
  let prodScore = 0;
  if (yieldLevel === 'excellent') prodScore += 15;
  else if (yieldLevel === 'good') prodScore += 12;
  else if (yieldLevel === 'fair') prodScore += 7;
  else if (yieldLevel === 'poor') prodScore += 3;

  if (loss === 'none') prodScore += 10;
  else if (loss === 'minor') prodScore += 7;
  else if (loss === 'moderate') prodScore += 3;
  // major = 0
  prodScore = Math.min(prodScore, 25);

  // ── 3. Advisory engagement (max 25) ─────────────────────────────────────────
  let advScore = 0;
  if (advisory === 'regular') advScore += 12;
  else if (advisory === 'sometimes') advScore += 8;
  else if (advisory === 'rarely') advScore += 4;
  // never = 0

  if (follow === 'always') advScore += 13;
  else if (follow === 'mostly') advScore += 10;
  else if (follow === 'sometimes') advScore += 5;
  else advScore += 1;
  advScore = Math.min(advScore, 25);

  // ── 4. Financial reliability (max 25) ───────────────────────────────────────
  let finScore = 0;
  if (prevLoan === 'yes-repaid') finScore += 15;
  else if (prevLoan === 'yes-active') finScore += 8;
  else if (prevLoan === 'no') finScore += 10; // no history is neutral
  // yes-default = 0

  if (coop === 'yes-active') finScore += 10;
  else if (coop === 'yes-inactive') finScore += 5;
  finScore = Math.min(finScore, 25);

  // ── Experience bonus (max 5) ─────────────────────────────────────────────────
  const expBonus = Math.min(seasons, 5);

  const total = Math.min(
    Math.round(agrScore + prodScore + advScore + finScore + expBonus),
    100
  );

  return { total, agrScore, prodScore, advScore, finScore };
}

function gradeFromScore(score) {
  if (score >= 80) return { grade: 'Strong',       tagline: 'Consistent practice and strong engagement. Strong candidate for input financing.' };
  if (score >= 65) return { grade: 'Good',          tagline: 'Solid farm management with minor gaps. Suitable for standard loan review.' };
  if (score >= 50) return { grade: 'Moderate',      tagline: 'Reasonable practice with some gaps. Field verification recommended before lending.' };
  if (score >= 35) return { grade: 'Developing',    tagline: 'Building track record. Smaller initial loan with close follow-up may be appropriate.' };
  return              { grade: 'Needs support',     tagline: 'Limited engagement signals. Advisory support recommended before advancing application.' };
}

function buildFlags(data) {
  const flags = [];
  const { timing, advisory, follow, yield: yieldLevel, loss, coop, prevLoan, inputs = [], seasons } = data;

  // Positives
  if (timing === 'on-time')
    flags.push({ type: 'positive', title: 'Planted on time', body: 'Farmer planted within the recommended window — strong planning signal.' });
  if (advisory === 'regular' && follow === 'always')
    flags.push({ type: 'positive', title: 'Full advisory engagement', body: 'Receives and follows extension advice consistently.' });
  if (yieldLevel === 'good' || yieldLevel === 'excellent')
    flags.push({ type: 'positive', title: 'Above-average yield', body: 'Self-reported yield is above regional average. Verify for large loans.' });
  if (coop === 'yes-active')
    flags.push({ type: 'positive', title: 'Active cooperative member', body: 'Cooperative membership provides social accountability.' });
  if (prevLoan === 'yes-repaid')
    flags.push({ type: 'positive', title: 'Previous loan repaid', body: 'Has a track record of repaying agricultural credit.' });
  if (inputs.includes('certified-seed') && inputs.includes('fertiliser'))
    flags.push({ type: 'positive', title: 'Good input package', body: 'Used certified seed and fertiliser — evidence of investment in production quality.' });
  if (seasons >= 5)
    flags.push({ type: 'positive', title: `${seasons} seasons of experience`, body: 'Farmer has significant experience on this land, reducing seasonal risk.' });

  // Warnings
  if (advisory === 'sometimes' || advisory === 'rarely')
    flags.push({ type: 'warning', title: 'Inconsistent advisory access', body: 'Link this loan to advisory support.' });
  if (loss === 'moderate')
    flags.push({ type: 'warning', title: 'Moderate crop loss reported', body: 'Assess whether weather-related or practice-related.' });
  if (!inputs.length || inputs.includes('none'))
    flags.push({ type: 'warning', title: 'Minimal input use', body: 'No formal inputs reported. May reflect cost constraints rather than poor practice.' });
  if (timing === 'late')
    flags.push({ type: 'warning', title: 'Late planting', body: 'Verify whether late planting was due to lack of inputs.' });

  // Risks
  if (prevLoan === 'yes-default')
    flags.push({ type: 'risk', title: 'Previous loan difficulty', body: 'Direct discussion required before advancing application.' });
  if (loss === 'major')
    flags.push({ type: 'risk', title: 'Major crop loss', body: 'Investigate cause. Field visit strongly recommended.' });
  if (advisory === 'never')
    flags.push({ type: 'risk', title: 'No advisory engagement', body: 'Mandatory extension support recommended alongside any loan.' });
  if (seasons <= 1)
    flags.push({ type: 'warning', title: 'Limited farm history', body: 'Only one season on record. Score confidence is lower than usual.' });

  return flags.slice(0, 6);
}

module.exports = { calculateScore, gradeFromScore, buildFlags };