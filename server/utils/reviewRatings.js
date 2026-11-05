export function summarizeRatings(reviews) {
  const grouped = [];
  for (const review of reviews) {
    if (review.isDemo) continue;
    const group = grouped.find((entry) => entry._id === review.rating);
    if (group) {
      group.count += 1;
      group.total += review.rating;
    } else {
      grouped.push({ _id: review.rating, count: 1, total: review.rating });
    }
  }
  return summarizeRatingGroups(grouped);
}

export function summarizeRatingGroups(groups) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let reviewCount = 0;
  let ratingTotal = 0;
  for (const group of groups) {
    distribution[group._id] = group.count;
    reviewCount += group.count;
    ratingTotal += group.total;
  }
  return {
    average: reviewCount ? Math.round((ratingTotal / reviewCount) * 10) / 10 : 0,
    total: reviewCount,
    distribution,
  };
}
