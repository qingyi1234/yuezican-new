import { useEffect, useMemo, useState } from "react";
import { defaultProfileOptions } from "./data";
import { buildRecommendation, getDefaultProfile } from "./recommender";
import type {
  ActivityLevel,
  DeliveryMode,
  DietRestriction,
  FeedingMode,
  Goal,
  MedicalHistory,
  Recipe,
  UserProfile,
} from "./types";

const deliveryLabels: Record<DeliveryMode, string> = {
  vaginal: "顺产",
  cesarean: "剖宫产",
};

const feedingLabels: Record<FeedingMode, string> = {
  breastfeeding: "母乳喂养",
  mixed: "混合喂养",
  notBreastfeeding: "不哺乳",
};

const activityLabels: Record<ActivityLevel, string> = {
  bedRest: "多卧床",
  light: "轻活动",
  normal: "恢复较好",
};

type PageMode = "setup" | "plan";
type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  profile: UserProfile;
};

const savedPlanKey = "yuezican_saved_plans_v1";

function toggleList<T extends string>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function parseAllergies(value: string) {
  return value
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readSavedPlans(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(savedPlanKey);
    return raw ? (JSON.parse(raw) as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

function writeSavedPlans(plans: SavedPlan[]) {
  window.localStorage.setItem(savedPlanKey, JSON.stringify(plans));
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`chip ${active ? "chipActive" : ""}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function HeroVisual() {
  return (
    <div className="heroVisual" aria-hidden="true">
      <div className="motherScene">
        <div className="sunDisc" />
        <div className="motherFigure">
          <span className="motherHead" />
          <span className="motherHair" />
          <span className="motherBody" />
          <span className="babyBundle" />
        </div>
      </div>
      <div className="foodScene">
        <span className="steam steamOne" />
        <span className="steam steamTwo" />
        <span className="bowl" />
        <span className="plate" />
        <span className="leaf leafOne" />
        <span className="leaf leafTwo" />
      </div>
      <div className="moveScene">
        <span className="mat" />
        <span className="poseHead" />
        <span className="poseBody" />
        <span className="poseArm" />
        <span className="poseLeg" />
      </div>
    </div>
  );
}

function MealArt({ mealType }: { mealType: Recipe["mealType"] }) {
  return (
    <div className={`mealArt ${mealType}Art`} aria-hidden="true">
      <span className="mealSteam mealSteamOne" />
      <span className="mealSteam mealSteamTwo" />
      <span className="mealPlate" />
      <span className="mealBowl" />
      <span className="mealLeaf" />
      <span className="mealGrain" />
    </div>
  );
}

function RecipeCard({ title, recipe }: { title: string; recipe: Recipe }) {
  return (
    <article className="recipeCard">
      <div className="recipeHead">
        <div>
          <span className="mealLabel">{title}</span>
          <h3>{recipe.name}</h3>
        </div>
        <MealArt mealType={recipe.mealType} />
      </div>
      <div className="recipeGrid">
        <div>
          <h4>食材</h4>
          <p>{recipe.ingredients.join("；")}</p>
        </div>
        <div>
          <h4>调味</h4>
          <p>{recipe.seasonings.join("；")}</p>
        </div>
      </div>
      <div>
        <h4>做法</h4>
        <ol>
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="tagRow">
        {recipe.nutritionTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <p className="muted">{recipe.replacements.join(" ")}</p>
      <p className="safety">{recipe.safetyNote}</p>
    </article>
  );
}

function ProfileForm({
  profile,
  allergyText,
  setAllergyText,
  setProfileField,
  onReset,
  onSubmit,
}: {
  profile: UserProfile;
  allergyText: string;
  setAllergyText: (value: string) => void;
  setProfileField: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="panel formPanel setupForm" aria-label="用户信息问卷">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">第一步</p>
          <h2>用户诉求</h2>
        </div>
        <button className="ghostButton" type="button" onClick={onReset}>
          重置
        </button>
      </div>

      <label className="field">
        <span>产后第 {profile.postpartumDay} 天</span>
        <input
          type="range"
          min="1"
          max="42"
          value={profile.postpartumDay}
          onChange={(event) => setProfileField("postpartumDay", Number(event.target.value))}
        />
      </label>

      <div className="fieldGroup">
        <span>分娩方式</span>
        <div className="segmented">
          {(Object.keys(deliveryLabels) as DeliveryMode[]).map((mode) => (
            <button
              className={profile.deliveryMode === mode ? "selected" : ""}
              type="button"
              key={mode}
              onClick={() => setProfileField("deliveryMode", mode)}
            >
              {deliveryLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>哺乳状态</span>
        <div className="segmented three">
          {(Object.keys(feedingLabels) as FeedingMode[]).map((mode) => (
            <button
              className={profile.feedingMode === mode ? "selected" : ""}
              type="button"
              key={mode}
              onClick={() => setProfileField("feedingMode", mode)}
            >
              {feedingLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="inlineFields">
        <label>
          <span>身高 cm</span>
          <input
            type="number"
            value={profile.heightCm}
            onChange={(event) => setProfileField("heightCm", Number(event.target.value))}
          />
        </label>
        <label>
          <span>孕前 kg</span>
          <input
            type="number"
            value={profile.prePregnancyWeightKg}
            onChange={(event) => setProfileField("prePregnancyWeightKg", Number(event.target.value))}
          />
        </label>
        <label>
          <span>当前 kg</span>
          <input
            type="number"
            value={profile.currentWeightKg}
            onChange={(event) => setProfileField("currentWeightKg", Number(event.target.value))}
          />
        </label>
      </div>

      <div className="fieldGroup">
        <span>活动能力</span>
        <div className="segmented three">
          {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
            <button
              className={profile.activityLevel === level ? "selected" : ""}
              type="button"
              key={level}
              onClick={() => setProfileField("activityLevel", level)}
            >
              {activityLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>过敏食物</span>
        <input
          type="text"
          placeholder="例如：虾、花生、牛奶"
          value={allergyText}
          onChange={(event) => {
            setAllergyText(event.target.value);
            setProfileField("allergies", parseAllergies(event.target.value));
          }}
        />
      </label>

      <div className="fieldGroup">
        <span>忌口/限制</span>
        <div className="chipWrap">
          {defaultProfileOptions.restrictions.map(([value, label]) => (
            <Chip
              active={profile.restrictions.includes(value)}
              key={value}
              onClick={() => setProfileField("restrictions", toggleList(profile.restrictions, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>常见病史</span>
        <div className="chipWrap">
          {defaultProfileOptions.medicalHistory.map(([value, label]) => (
            <Chip
              active={profile.medicalHistory.includes(value)}
              key={value}
              onClick={() => setProfileField("medicalHistory", toggleList(profile.medicalHistory, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>目标诉求</span>
        <div className="chipWrap">
          {defaultProfileOptions.goals.map(([value, label]) => (
            <Chip
              active={profile.goals.includes(value)}
              key={value}
              onClick={() => setProfileField("goals", toggleList(profile.goals, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <button className="primaryButton" type="button" onClick={onSubmit}>
        生成42天月子餐方案
      </button>
    </section>
  );
}

function App() {
  const [page, setPage] = useState<PageMode>("setup");
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile);
  const [allergyText, setAllergyText] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const result = useMemo(() => buildRecommendation(profile), [profile]);
  const selectedDay = result.selectedDay;
  const metricByLabel = new Map(result.selectedRecovery.metrics.map((metric) => [metric.label, metric]));
  const recoveryHighlights = [
    {
      label: "今日总时长",
      value: result.selectedRecovery.duration,
      note: `${result.selectedRecovery.intensity}强度，分段完成更稳妥`,
    },
    {
      label: "步行目标",
      value: metricByLabel.get("步行")?.target ?? "按身体反应调整",
      note: metricByLabel.get("步行")?.frequency ?? "每天分段",
    },
    {
      label: "盆底肌",
      value: metricByLabel.get("盆底肌")?.target ?? "8-10次/组",
      note: metricByLabel.get("盆底肌")?.frequency ?? "每天2-3组",
    },
    {
      label: "主观强度",
      value: metricByLabel.get("主观强度")?.target ?? "RPE 2-4/10",
      note: "运动后无疼痛、无出血增加",
    },
  ];

  const setProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    setSavedPlans(readSavedPlans());
  }, []);

  const persistSavedPlans = (plans: SavedPlan[]) => {
    setSavedPlans(plans);
    writeSavedPlans(plans);
  };

  const resetProfile = () => {
    setProfile(getDefaultProfile());
    setAllergyText("");
    setSaveMessage("");
  };

  const saveCurrentPlan = () => {
    const planName = `第${profile.postpartumDay}天-${deliveryLabels[profile.deliveryMode]}-${feedingLabels[profile.feedingMode]}`;
    const nextPlan: SavedPlan = {
      id: `${Date.now()}`,
      name: planName,
      createdAt: new Date().toLocaleString("zh-CN"),
      profile,
    };
    const nextPlans = [nextPlan, ...savedPlans.filter((plan) => plan.name !== planName)].slice(0, 6);
    persistSavedPlans(nextPlans);
    setSaveMessage("已保存当前方案设置，可在首页一键恢复。");
  };

  const loadSavedPlan = (plan: SavedPlan) => {
    setProfile(plan.profile);
    setAllergyText(plan.profile.allergies.join("、"));
    setSaveMessage(`已恢复：${plan.name}`);
    setPage("plan");
  };

  const deleteSavedPlan = (planId: string) => {
    persistSavedPlans(savedPlans.filter((plan) => plan.id !== planId));
    setSaveMessage("已删除保存方案。");
  };

  if (page === "setup") {
    return (
      <main>
        <section className="heroBand setupHero">
          <div className="heroInner">
            <div>
              <p className="eyebrow">月子餐个性化推荐</p>
              <h1>专业规则推荐，让42天月子餐更清淡、更稳、更好执行</h1>
              <p className="heroCopy">
                系统会根据产后天数、顺产/剖宫产、哺乳状态、过敏忌口和常见病史做规则推荐。新增血糖管理餐、崔玉涛健康教育风格清淡餐和本地保存方案。
              </p>
            </div>
            <div className="heroShowcase">
              <HeroVisual />
              <div className="heroStats" aria-label="营养原则摘要">
                <strong>填写完成后进入方案页</strong>
                <span>三餐、加餐、汤饮、水果、康复动作一次生成</span>
                <span>可保存当前设置，下次用同一浏览器快速恢复</span>
              </div>
            </div>
          </div>
          <div className="heroProofGrid" aria-label="推荐系统特点">
            <article>
              <span>01</span>
              <strong>病种适配</strong>
              <p>妊娠糖尿病、高血压、贫血、便秘、堵奶风险按规则调整主食、汤饮、甜品和调味。</p>
            </article>
            <article>
              <span>02</span>
              <strong>清淡不过补</strong>
              <p>参考崔玉涛健康教育风格：不过度进补，不油腻催奶，不把单一食物神化。</p>
            </article>
            <article>
              <span>03</span>
              <strong>本地保存</strong>
              <p>方案只保存在用户自己的浏览器里，便于家属反复查看，不需要登录。</p>
            </article>
          </div>
          <div className="visualStrip" aria-label="网站能力">
            <div>
              <span className="stripIcon motherMini" />
              <strong>妈妈恢复</strong>
              <p>顺产、剖宫产与产后阶段分开处理</p>
            </div>
            <div>
              <span className="stripIcon foodMini" />
              <strong>均衡月子餐</strong>
              <p>具体到食材、做法、调味与替换建议</p>
            </div>
            <div>
              <span className="stripIcon moveMini" />
              <strong>康复锻炼</strong>
              <p>呼吸、盆底、散步和轻阻力量化安排</p>
            </div>
          </div>
        </section>

        <section className="setupWorkspace">
          <ProfileForm
            profile={profile}
            allergyText={allergyText}
            setAllergyText={setAllergyText}
            setProfileField={setProfileField}
            onReset={resetProfile}
            onSubmit={() => setPage("plan")}
          />
          <section className="panel savedPlanPanel" aria-label="已保存方案">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">本地保存</p>
                <h2>已保存方案</h2>
              </div>
              <span>{savedPlans.length}/6</span>
            </div>
            {saveMessage && <p className="saveMessage">{saveMessage}</p>}
            {savedPlans.length > 0 ? (
              <div className="savedPlanList">
                {savedPlans.map((plan) => (
                  <article key={plan.id} className="savedPlanItem">
                    <div>
                      <strong>{plan.name}</strong>
                      <p>{plan.createdAt}</p>
                    </div>
                    <div>
                      <button className="ghostButton" type="button" onClick={() => loadSavedPlan(plan)}>
                        恢复
                      </button>
                      <button className="textButton" type="button" onClick={() => deleteSavedPlan(plan.id)}>
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">还没有保存的方案。生成方案后点击“保存方案”，下次打开可直接恢复。</p>
            )}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="planPage">
      <section className="planTop">
        <div className="planTopInner">
          <div>
            <p className="eyebrow">推荐结果</p>
            <h1>第 {selectedDay.day} 天月子餐与康复方案</h1>
            <p>
              {selectedDay.phase}，当前体重较孕前
              {profile.currentWeightKg - profile.prePregnancyWeightKg >= 0 ? "增加" : "减少"}
              {Math.abs(profile.currentWeightKg - profile.prePregnancyWeightKg).toFixed(1)}kg。
            </p>
          </div>
          <div className="planProfile">
            <span>{deliveryLabels[profile.deliveryMode]}</span>
            <span>{feedingLabels[profile.feedingMode]}</span>
            <span>{activityLabels[profile.activityLevel]}</span>
            <button className="saveButton" type="button" onClick={saveCurrentPlan}>
              保存方案
            </button>
            <button className="ghostButton" type="button" onClick={() => setPage("setup")}>
              修改诉求
            </button>
          </div>
        </div>
      </section>

      <section className="planWorkspace">
        <section className="panel dayPanel">
          <div>
            <p className="eyebrow">42天日历</p>
            <h2>选择查看哪一天</h2>
          </div>
          <div className="dayPicker" aria-label="选择42天中的一天">
            {result.days.map((day) => (
              <button
                key={day.day}
                type="button"
                className={day.day === profile.postpartumDay ? "currentDay" : ""}
                onClick={() => setProfileField("postpartumDay", day.day)}
              >
                {day.day}
              </button>
            ))}
          </div>
        </section>

        <section className="noticeGrid">
          {result.riskWarnings.map((warning) => (
            <p className="warning" key={warning}>
              {warning}
            </p>
          ))}
        </section>
        {saveMessage && <p className="saveMessage inlineSaveMessage">{saveMessage}</p>}

        <section className="panel conditionGuidePanel">
          <div>
            <p className="eyebrow">病种与原则适配</p>
            <h2>当前方案的重点规则</h2>
          </div>
          <div className="conditionGuideGrid">
            {result.conditionGuides.map((guide) => (
              <p key={guide}>{guide}</p>
            ))}
          </div>
        </section>

        <section className="sectionHeader">
          <div>
            <p className="eyebrow">今日食谱</p>
            <h2>三餐、汤饮、加餐与做法</h2>
          </div>
          <p>每张卡片包含食材克数、调味、步骤、替换项和食品卫生提醒。</p>
        </section>

        <section className="mealGrid planMealGrid">
          <RecipeCard title="早餐" recipe={selectedDay.breakfast} />
          <RecipeCard title="午餐" recipe={selectedDay.lunch} />
          <RecipeCard title="晚餐" recipe={selectedDay.dinner} />
          <RecipeCard title="汤饮" recipe={selectedDay.soup} />
          {selectedDay.snacks.map((snack, index) => (
            <RecipeCard key={`${snack.id}-${index}`} title={index === 0 ? "加餐一" : "加餐二"} recipe={snack} />
          ))}
        </section>

        <section className="panel infoPanel planInfoPanel">
          <div>
            <h2>水果与今日营养重点</h2>
            <p className="fruit">{selectedDay.fruit}</p>
            <ul>
              {selectedDay.nutritionFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>规则说明</h2>
            {selectedDay.ruleNotes.length > 0 ? (
              <ul>
                {selectedDay.ruleNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>当前没有额外忌口，系统按阶段、哺乳和目标诉求轮换菜单。</p>
            )}
            {result.replacedOrAvoided.length > 0 && (
              <p className="muted">已避开候选菜：{result.replacedOrAvoided.join("、")}</p>
            )}
          </div>
        </section>

        <section className="panel recoveryPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">康复推荐</p>
              <h2>
                第 {result.selectedRecovery.day} 天 · {result.selectedRecovery.intensity}强度 ·{" "}
                {result.selectedRecovery.duration}
              </h2>
            </div>
            <div className="recoveryArt" aria-hidden="true">
              <span className="recoveryMat" />
              <span className="recoveryHead" />
              <span className="recoveryTorso" />
              <span className="recoveryArm" />
              <span className="recoveryLeg" />
            </div>
          </div>
          <div className="recoveryDashboard">
            {recoveryHighlights.map((item) => (
              <article className="recoveryMetricCard" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
          <div className="metricTableWrap">
            <div className="metricTableHeader">
              <div>
                <h3>今日锻炼量化指标</h3>
                <p>先完成呼吸和盆底，再根据体力增加步行与关节活动。</p>
              </div>
              <span>动作后第二天不加重，下一天再维持或小幅增加</span>
            </div>
            <table className="metricTable">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>目标量</th>
                  <th>频次</th>
                  <th>执行提醒</th>
                </tr>
              </thead>
              <tbody>
                {result.selectedRecovery.metrics.map((metric) => (
                  <tr key={metric.label}>
                    <td>{metric.label}</td>
                    <td>{metric.target}</td>
                    <td>{metric.frequency}</td>
                    <td>{metric.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="recoverySectionTitle">
            <div>
              <p className="eyebrow">动作处方</p>
              <h3>按顺序完成，任何不适立即降量</h3>
            </div>
          </div>
          <div className="actionGrid compactActionGrid">
            {result.selectedRecovery.actions.map((action) => (
              <article className="actionCard" key={action.name}>
                <h3>{action.name}</h3>
                <p className="duration">{action.duration}</p>
                <ol>
                  {action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="muted">适合：{action.suitableFor.join("、")}</p>
                <p className="safety">暂停：{action.avoidWhen.join("、")}</p>
              </article>
            ))}
          </div>
          <div className="stopBox">
            <strong>出现以下情况停止并就医</strong>
            <p>{result.selectedRecovery.stopSignals.join("；")}</p>
          </div>
        </section>

        <section className="panel principlePanel">
          <h2>营养与食品卫生依据</h2>
          <div className="principleGrid">
            {result.nutritionPrinciples.map((principle) => (
              <p key={principle}>{principle}</p>
            ))}
          </div>
          <div className="sourceLinks">
            <a href="https://dg.cnsoc.org/article/04/hjgfxca3Ra69sKbvqDETbg.html" target="_blank" rel="noreferrer">
              中国孕妇、乳母膳食指南2022
            </a>
            <a href="https://www.who.int/publications/i/item/9789240045989" target="_blank" rel="noreferrer">
              WHO产后护理指南2022
            </a>
            <a
              href="https://www.cdc.gov/breastfeeding-special-circumstances/hcp/diet-micronutrients/maternal-diet.html"
              target="_blank"
              rel="noreferrer"
            >
              CDC母乳期饮食
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
