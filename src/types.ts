export type DeliveryMode = "vaginal" | "cesarean";
export type FeedingMode = "breastfeeding" | "mixed" | "notBreastfeeding";
export type ActivityLevel = "bedRest" | "light" | "normal";

export type MedicalHistory =
  | "gestationalDiabetes"
  | "hypertension"
  | "anemia"
  | "constipation"
  | "thyroid"
  | "pluggedDuctRisk"
  | "lactoseIntolerance";

export type Goal =
  | "weightControl"
  | "lactation"
  | "iron"
  | "calcium"
  | "lightTaste"
  | "constipationRelief"
  | "woundHealing";

export type DietRestriction =
  | "noPork"
  | "noBeefLamb"
  | "vegetarian"
  | "noSeafood"
  | "noEgg"
  | "noMilk"
  | "noSoy"
  | "noPeanut";

export interface UserProfile {
  postpartumDay: number;
  deliveryMode: DeliveryMode;
  feedingMode: FeedingMode;
  heightCm: number;
  currentWeightKg: number;
  prePregnancyWeightKg: number;
  activityLevel: ActivityLevel;
  allergies: string[];
  restrictions: DietRestriction[];
  medicalHistory: MedicalHistory[];
  goals: Goal[];
}

export interface Recipe {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "soup";
  phaseMin: number;
  phaseMax: number;
  ingredients: string[];
  seasonings: string[];
  steps: string[];
  nutritionTags: string[];
  avoidTags: Array<DietRestriction | MedicalHistory | Goal | DeliveryMode>;
  preferTags: Array<MedicalHistory | Goal | FeedingMode | DeliveryMode | DietRestriction>;
  replacements: string[];
  safetyNote: string;
}

export interface MealPlanDay {
  day: number;
  phase: string;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
  snacks: Recipe[];
  soup: Recipe;
  fruit: string;
  nutritionFocus: string[];
  ruleNotes: string[];
}

export interface RecoveryAction {
  name: string;
  duration: string;
  steps: string[];
  suitableFor: string[];
  avoidWhen: string[];
}

export interface RecoveryMetric {
  label: string;
  target: string;
  frequency: string;
  note: string;
}

export interface RecoveryPlanDay {
  day: number;
  intensity: "低" | "低到中" | "中";
  duration: string;
  actions: RecoveryAction[];
  metrics: RecoveryMetric[];
  stopSignals: string[];
}

export interface RecommendationResult {
  days: MealPlanDay[];
  selectedDay: MealPlanDay;
  selectedRecovery: RecoveryPlanDay;
  replacedOrAvoided: string[];
  riskWarnings: string[];
  conditionGuides: string[];
  nutritionPrinciples: string[];
  recoverySummary: string[];
}
