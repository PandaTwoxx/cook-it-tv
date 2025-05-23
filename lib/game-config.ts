// Game configuration for Cook'it

// Cook rarities with their drop rates and sell values
export const cookRarities = [
  {
    type: "Secret",
    cooks: ["OG party"],
    dropRate: 0.0003,
    sellValue: 50000,
    icon: "👑",
  },
  {
    type: "Michelin",
    cooks: ["GoogleChroma", "Valens"],
    dropRate: 0.00475,
    sellValue: 1000,
    icon: "⭐",
  },
  {
    type: "Exotic",
    cooks: ["Splash88", "SigmaQian"],
    dropRate: 0.04,
    sellValue: 300,
    icon: "🌟",
  },
  {
    type: "5-star",
    cooks: ["Katie"],
    dropRate: 0.31,
    sellValue: 200,
    icon: "🔥",
  },
  {
    type: "Epic",
    cooks: ["placeholder1", "placeholder2"],
    dropRate: 2.3,
    sellValue: 75,
    icon: "✨",
  },
  {
    type: "Rare",
    cooks: ["blabla", "placeholder3"],
    dropRate: 10,
    sellValue: 20,
    icon: "🍳",
  },
  {
    type: "Uncommon",
    cooks: ["kittenlove1311", "RoadToS", "placeholder3", "Turtlekid2022"],
    dropRate: 18.75,
    sellValue: 5,
    icon: "👨‍🍳",
  },
]

// Pack prices
export const packPrices = {
  og: 25,
}
