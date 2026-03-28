import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase.js";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query
} from "firebase/firestore";

// ─── Firestore Helpers ──────────────────────────────────────────────
const recipesCol = collection(db, "recipes");
const weekplanCol = collection(db, "weekplan");

async function fbPut(col, item) {
  await setDoc(doc(col, item.id), item);
}
async function fbDelete(col, id) {
  await deleteDoc(doc(col, id));
}

// ─── Constants ──────────────────────────────────────────────────────
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEALS = ["Frühstück", "Mittagessen", "Abendessen"];
const ALL_TAGS = ["Vegetarisch", "Vegan", "Schnell", "Deftig", "Süß", "Low-Carb", "Asiatisch", "Italienisch", "Deutsch", "Snack"];
const UNITS = ["g", "kg", "ml", "l", "EL", "TL", "Stück", "Prise", "Bund", "Dose", "Becher", "Scheibe"];

const CATEGORY_MAP = {
  "Obst & Gemüse": ["salat", "tomate", "gurke", "paprika", "zwiebel", "knoblauch", "kartoffel", "karotte", "möhre", "zucchini", "aubergine", "spinat", "brokkoli", "blumenkohl", "pilz", "champignon", "lauch", "apfel", "banane", "zitrone", "lime", "avocado", "ingwer", "chili", "petersilie", "basilikum", "koriander", "dill", "schnittlauch", "minze", "rosmarin", "thymian", "oregano", "bund", "frühlingszwiebel", "sellerie", "kürbis", "mais", "erbse", "bohne", "linse"],
  "Milchprodukte": ["milch", "butter", "sahne", "käse", "joghurt", "quark", "schmand", "crème", "mozzarella", "parmesan", "gouda", "feta", "frischkäse", "mascarpone", "ricotta"],
  "Fleisch & Fisch": ["fleisch", "hähnchen", "huhn", "rind", "schwein", "hack", "wurst", "schinken", "speck", "bacon", "lachs", "thunfisch", "garnele", "fisch", "filet", "steak", "bratwurst", "salami"],
  "Backwaren": ["brot", "brötchen", "toast", "mehl", "hefe", "backpulver", "tortilla", "wrap", "nudel", "pasta", "spaghetti", "penne", "reis", "couscous", "bulgur"],
  "Gewürze & Saucen": ["salz", "pfeffer", "paprikapulver", "kurkuma", "zimt", "muskat", "curry", "kreuzkümmel", "sojasauce", "essig", "senf", "ketchup", "mayo", "worcester", "tabasco", "honig", "zucker", "vanille", "öl", "olivenöl"],
  "Getränke": ["wasser", "saft", "wein", "bier", "kokosmilch"],
  "Sonstiges": []
};

function categorize(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (cat === "Sonstiges") continue;
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return "Sonstiges";
}

// ─── Theme ──────────────────────────────────────────────────────────
const theme = {
  bg: "#0f1117", surface: "#1a1d27", surfaceHover: "#222636", card: "#1e2230",
  accent: "#e8883a", accentSoft: "rgba(232,136,58,0.15)", accentGlow: "rgba(232,136,58,0.3)",
  text: "#e8e6e1", textDim: "#8a8b94", textMuted: "#5a5b64",
  border: "#2a2d3a", danger: "#e85454", dangerSoft: "rgba(232,84,84,0.15)",
  success: "#4ade80", successSoft: "rgba(74,222,128,0.12)",
  tag: "#6366f1", tagSoft: "rgba(99,102,241,0.15)",
  radius: "14px", radiusSm: "10px",
  shadow: "0 4px 24px rgba(0,0,0,0.3)",
  font: "'Outfit', 'Segoe UI', system-ui, sans-serif",
};

// ─── App Component ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("recipes");
  const [recipes, setRecipes] = useState([]);
  const [weekPlan, setWeekPlan] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [toast, setToast] = useState(null);

  // Real-time sync with Firestore
  useEffect(() => {
    let recipesLoaded = false;
    let planLoaded = false;
    const checkLoaded = () => { if (recipesLoaded && planLoaded) setLoaded(true); };

    const unsubRecipes = onSnapshot(query(recipesCol), (snap) => {
      const data = snap.docs.map(d => d.data());
      setRecipes(data);
      recipesLoaded = true;
      checkLoaded();
    });

    const unsubPlan = onSnapshot(query(weekplanCol), (snap) => {
      const plan = {};
      snap.docs.forEach(d => { plan[d.id] = d.data(); });
      setWeekPlan(plan);
      planLoaded = true;
      checkLoaded();
    });

    return () => { unsubRecipes(); unsubPlan(); };
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const saveRecipe = async (recipe) => {
    await fbPut(recipesCol, recipe);
    setShowForm(false);
    setEditRecipe(null);
    showToast("Rezept gespeichert ✓");
  };

  const deleteRecipe = async (id) => {
    await fbDelete(recipesCol, id);
    setViewRecipe(null);
    showToast("Rezept gelöscht");
  };

  const assignMeal = async (day, meal, recipeId) => {
    const key = `${day}-${meal}`;
    const item = { id: key, day, meal, recipeId };
    await fbPut(weekplanCol, item);
  };

  const clearMeal = async (day, meal) => {
    const key = `${day}-${meal}`;
    await fbDelete(weekplanCol, key);
  };

  const generatePlan = async () => {
    if (recipes.length === 0) { showToast("Erst Rezepte hinzufügen!"); return; }
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const key = `${day}-${meal}`;
        const r = recipes[Math.floor(Math.random() * recipes.length)];
        await fbPut(weekplanCol, { id: key, day, meal, recipeId: r.id });
      }
    }
    showToast("Wochenplan generiert ✓");
  };

  const generateShoppingList = () => {
    const items = {};
    Object.values(weekPlan).forEach(({ recipeId }) => {
      const r = recipes.find(x => x.id === recipeId);
      if (!r) return;
      r.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}_${ing.unit}`;
        if (items[key]) { items[key].amount += ing.amount; }
        else { items[key] = { ...ing, amount: ing.amount }; }
      });
    });
    const grouped = {};
    Object.values(items).forEach(item => {
      const cat = categorize(item.name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    setShoppingList(grouped);
    setView("shopping");
  };

  if (!loaded) return (
    <div style={{ background: theme.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font }}>
      <div style={{ color: theme.accent, fontSize: 20 }}>Laden...</div>
    </div>
  );

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: theme.font, color: theme.text, paddingBottom: 90, position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.bg} 100%)`, padding: "20px 20px 16px", borderBottom: `1px solid ${theme.border}`, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🍽️</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, background: `linear-gradient(135deg, ${theme.accent}, #f0a860)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MealPlanner</h1>
          <span style={{ marginLeft: "auto", fontSize: 10, color: theme.success, background: theme.successSoft, padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>● Sync</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 999,
          background: theme.card, color: theme.text, padding: "12px 24px", borderRadius: 30,
          boxShadow: theme.shadow, border: `1px solid ${theme.border}`, fontSize: 14, fontWeight: 500,
          animation: "fadeIn .3s ease"
        }}>{toast}</div>
      )}

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {view === "recipes" && !showForm && !viewRecipe && (
          <RecipeList recipes={recipes} onAdd={() => { setEditRecipe(null); setShowForm(true); }} onView={setViewRecipe} />
        )}
        {view === "recipes" && showForm && (
          <RecipeForm recipe={editRecipe} onSave={saveRecipe} onCancel={() => { setShowForm(false); setEditRecipe(null); }} />
        )}
        {view === "recipes" && viewRecipe && (
          <RecipeDetail recipe={viewRecipe} onBack={() => setViewRecipe(null)}
            onEdit={(r) => { setViewRecipe(null); setEditRecipe(r); setShowForm(true); }}
            onDelete={deleteRecipe} />
        )}
        {view === "plan" && (
          <WeekPlanView weekPlan={weekPlan} recipes={recipes} onGenerate={generatePlan}
            onAssign={assignMeal} onClear={clearMeal} onShopping={generateShoppingList} />
        )}
        {view === "shopping" && shoppingList && (
          <ShoppingListView list={shoppingList} onBack={() => setView("plan")} />
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: theme.surface, borderTop: `1px solid ${theme.border}`,
        display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))"
      }}>
        {[
          { id: "recipes", icon: "📖", label: "Rezepte" },
          { id: "plan", icon: "📅", label: "Wochenplan" },
          { id: "shopping", icon: "🛒", label: "Einkauf" },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setView(tab.id); setShowForm(false); setViewRecipe(null); }}
            style={{
              background: "none", border: "none", color: view === tab.id ? theme.accent : theme.textDim,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              fontSize: 11, fontWeight: view === tab.id ? 600 : 400, cursor: "pointer", padding: "6px 16px",
              fontFamily: theme.font, transition: "color .2s"
            }}>
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateX(-50%) translateY(-8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, textarea, select { font-family: ${theme.font}; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", style: s = {}, ...props }) {
  const base = {
    border: "none", borderRadius: theme.radiusSm, padding: "12px 20px", fontSize: 14,
    fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center",
    gap: 8, fontFamily: theme.font, transition: "all .2s", ...s
  };
  const variants = {
    primary: { background: theme.accent, color: "#fff" },
    secondary: { background: theme.accentSoft, color: theme.accent },
    ghost: { background: "transparent", color: theme.textDim, padding: "8px 12px" },
    danger: { background: theme.dangerSoft, color: theme.danger },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant] }} {...props}>{children}</button>;
}

function TagChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? theme.accent : theme.surface, color: active ? "#fff" : theme.textDim,
      border: `1px solid ${active ? theme.accent : theme.border}`, borderRadius: 20,
      padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: theme.font,
      transition: "all .2s"
    }}>{label}</button>
  );
}

// ─── Recipe List ────────────────────────────────────────────────────
function RecipeList({ recipes, onAdd, onView }) {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState(null);

  const filtered = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag && !(r.tags || []).includes(filterTag)) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Meine Rezepte <span style={{ color: theme.textMuted, fontWeight: 400 }}>({recipes.length})</span></h2>
        <Btn onClick={onAdd}>＋ Neu</Btn>
      </div>

      <input placeholder="🔍 Suchen..." value={search} onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%", padding: "12px 16px", background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: theme.radiusSm, color: theme.text, fontSize: 15, marginBottom: 12, outline: "none"
        }} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <TagChip label="Alle" active={!filterTag} onClick={() => setFilterTag(null)} />
        {ALL_TAGS.map(t => (
          <TagChip key={t} label={t} active={filterTag === t} onClick={() => setFilterTag(filterTag === t ? null : t)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥘</div>
          <p>{recipes.length === 0 ? "Noch keine Rezepte. Leg los!" : "Keine Rezepte gefunden."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => onView(r)}
              style={{
                background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`,
                overflow: "hidden", cursor: "pointer", transition: "border-color .2s", display: "flex"
              }}>
              {r.photo ? (
                <div style={{
                  width: 90, minHeight: 90, backgroundImage: `url(${r.photo})`,
                  backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0
                }} />
              ) : (
                <div style={{
                  width: 90, minHeight: 90, background: theme.accentSoft, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0
                }}>🍳</div>
              )}
              <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 6 }}>
                  {r.ingredients.length} Zutaten · {r.servings} Port.
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(r.tags || []).slice(0, 3).map(t => (
                    <span key={t} style={{ fontSize: 10, background: theme.tagSoft, color: theme.tag, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recipe Form ────────────────────────────────────────────────────
function RecipeForm({ recipe, onSave, onCancel }) {
  const [name, setName] = useState(recipe?.name || "");
  const [servings, setServings] = useState(recipe?.servings || 4);
  const [tags, setTags] = useState(recipe?.tags || []);
  const [ingredients, setIngredients] = useState(recipe?.ingredients || [{ name: "", amount: "", unit: "g" }]);
  const [steps, setSteps] = useState(recipe?.steps || "");
  const [photo, setPhoto] = useState(recipe?.photo || null);
  const fileRef = useRef();

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const updateIng = (i, field, val) => {
    const n = [...ingredients];
    n[i] = { ...n[i], [field]: field === "amount" ? (val === "" ? "" : Number(val)) : val };
    setIngredients(n);
  };

  const addIng = () => setIngredients([...ingredients, { name: "", amount: "", unit: "g" }]);
  const removeIng = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Resize image to avoid Firestore 1MB doc limit
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 400;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const validIngs = ingredients.filter(i => i.name.trim());
    onSave({
      id: recipe?.id || `recipe_${Date.now()}`,
      name: name.trim(), servings, tags, steps,
      ingredients: validIngs, photo
    });
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", background: theme.surface, border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, outline: "none"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{recipe ? "Rezept bearbeiten" : "Neues Rezept"}</h2>
        <Btn variant="ghost" onClick={onCancel}>✕</Btn>
      </div>

      <div onClick={() => fileRef.current?.click()} style={{
        width: "100%", height: 160, borderRadius: theme.radius, border: `2px dashed ${theme.border}`,
        background: photo ? `url(${photo}) center/cover` : theme.surface,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        marginBottom: 16, overflow: "hidden", position: "relative"
      }}>
        {!photo && <span style={{ color: theme.textDim, fontSize: 14 }}>📷 Foto hinzufügen</span>}
        {photo && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>📷 Ändern</span>
        </div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />

      <label style={{ fontSize: 13, color: theme.textDim, display: "block", marginBottom: 6 }}>Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Spaghetti Bolognese" style={{ ...inputStyle, marginBottom: 14 }} />

      <label style={{ fontSize: 13, color: theme.textDim, display: "block", marginBottom: 6 }}>Portionen</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Btn variant="secondary" onClick={() => setServings(Math.max(1, servings - 1))} style={{ padding: "8px 14px" }}>−</Btn>
        <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{servings}</span>
        <Btn variant="secondary" onClick={() => setServings(servings + 1)} style={{ padding: "8px 14px" }}>+</Btn>
      </div>

      <label style={{ fontSize: 13, color: theme.textDim, display: "block", marginBottom: 6 }}>Tags</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {ALL_TAGS.map(t => (
          <TagChip key={t} label={t} active={tags.includes(t)} onClick={() => toggleTag(t)} />
        ))}
      </div>

      <label style={{ fontSize: 13, color: theme.textDim, display: "block", marginBottom: 6 }}>Zutaten</label>
      <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
        {ingredients.map((ing, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={ing.amount} onChange={e => updateIng(i, "amount", e.target.value)} placeholder="Menge"
              type="number" style={{ ...inputStyle, width: 70, padding: "9px 8px", textAlign: "center" }} />
            <select value={ing.unit} onChange={e => updateIng(i, "unit", e.target.value)}
              style={{ ...inputStyle, width: 80, padding: "9px 6px" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input value={ing.name} onChange={e => updateIng(i, "name", e.target.value)} placeholder="Zutat"
              style={{ ...inputStyle, flex: 1 }} />
            {ingredients.length > 1 && (
              <button onClick={() => removeIng(i)} style={{
                background: "none", border: "none", color: theme.danger, fontSize: 18, cursor: "pointer", padding: 4
              }}>✕</button>
            )}
          </div>
        ))}
      </div>
      <Btn variant="secondary" onClick={addIng} style={{ marginBottom: 16, width: "100%" }}>＋ Zutat</Btn>

      <label style={{ fontSize: 13, color: theme.textDim, display: "block", marginBottom: 6 }}>Zubereitung (optional)</label>
      <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={4} placeholder="Schritte beschreiben..."
        style={{ ...inputStyle, resize: "vertical", marginBottom: 20 }} />

      <Btn onClick={handleSave} style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 16 }}>
        💾 Speichern
      </Btn>
    </div>
  );
}

// ─── Recipe Detail ──────────────────────────────────────────────────
function RecipeDetail({ recipe, onBack, onEdit, onDelete }) {
  const [portions, setPortions] = useState(recipe.servings);
  const scale = portions / recipe.servings;

  return (
    <div>
      <Btn variant="ghost" onClick={onBack} style={{ marginBottom: 12 }}>← Zurück</Btn>

      {recipe.photo && (
        <div style={{
          width: "100%", height: 200, borderRadius: theme.radius, overflow: "hidden", marginBottom: 16,
          backgroundImage: `url(${recipe.photo})`, backgroundSize: "cover", backgroundPosition: "center"
        }} />
      )}

      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{recipe.name}</h2>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {(recipe.tags || []).map(t => (
          <span key={t} style={{ fontSize: 11, background: theme.tagSoft, color: theme.tag, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>{t}</span>
        ))}
      </div>

      <div style={{
        background: theme.accentSoft, borderRadius: theme.radiusSm, padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16
      }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Portionen</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn variant="secondary" onClick={() => setPortions(Math.max(1, portions - 1))} style={{ padding: "6px 12px" }}>−</Btn>
          <span style={{ fontSize: 20, fontWeight: 700, color: theme.accent, minWidth: 24, textAlign: "center" }}>{portions}</span>
          <Btn variant="secondary" onClick={() => setPortions(portions + 1)} style={{ padding: "6px 12px" }}>+</Btn>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: theme.textDim }}>Zutaten</h3>
      <div style={{ background: theme.surface, borderRadius: theme.radiusSm, overflow: "hidden", marginBottom: 16 }}>
        {recipe.ingredients.map((ing, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "10px 14px",
            borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${theme.border}` : "none"
          }}>
            <span>{ing.name}</span>
            <span style={{ color: theme.accent, fontWeight: 600 }}>
              {Math.round(ing.amount * scale * 10) / 10} {ing.unit}
            </span>
          </div>
        ))}
      </div>

      {recipe.steps && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: theme.textDim }}>Zubereitung</h3>
          <div style={{ background: theme.surface, borderRadius: theme.radiusSm, padding: 14, marginBottom: 16, lineHeight: 1.6, fontSize: 14, whiteSpace: "pre-wrap" }}>
            {recipe.steps}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="secondary" onClick={() => onEdit(recipe)} style={{ flex: 1, justifyContent: "center" }}>✏️ Bearbeiten</Btn>
        <Btn variant="danger" onClick={() => { if (confirm("Rezept wirklich löschen?")) onDelete(recipe.id); }} style={{ justifyContent: "center" }}>🗑️</Btn>
      </div>
    </div>
  );
}

// ─── Week Plan ──────────────────────────────────────────────────────
function WeekPlanView({ weekPlan, recipes, onGenerate, onAssign, onClear, onShopping }) {
  const [picker, setPicker] = useState(null);
  const filledCount = Object.keys(weekPlan).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Wochenplan</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={onGenerate}>🎲 Generieren</Btn>
          {filledCount > 0 && <Btn onClick={onShopping}>🛒 Einkaufsliste</Btn>}
        </div>
      </div>

      {picker && (
        <MealPicker day={picker.day} meal={picker.meal} recipes={recipes}
          onSelect={(rid) => { onAssign(picker.day, picker.meal, rid); setPicker(null); }}
          onClose={() => setPicker(null)} />
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {DAYS.map(day => (
          <div key={day} style={{ background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
            <div style={{ background: theme.accentSoft, padding: "10px 14px", fontWeight: 600, fontSize: 14 }}>{day}</div>
            {MEALS.map(meal => {
              const key = `${day}-${meal}`;
              const entry = weekPlan[key];
              const r = entry ? recipes.find(x => x.id === entry.recipeId) : null;
              return (
                <div key={meal} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", borderTop: `1px solid ${theme.border}`, minHeight: 44
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 500 }}>{meal}</span>
                    <div style={{ fontSize: 13, fontWeight: r ? 500 : 400, color: r ? theme.text : theme.textMuted, marginTop: 1 }}>
                      {r ? r.name : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setPicker({ day, meal })} style={{
                      background: "none", border: "none", fontSize: 16, cursor: "pointer", color: theme.textDim, padding: 4
                    }}>✏️</button>
                    {r && <button onClick={() => onClear(day, meal)} style={{
                      background: "none", border: "none", fontSize: 14, cursor: "pointer", color: theme.danger, padding: 4
                    }}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Meal Picker Modal ──────────────────────────────────────────────
function MealPicker({ day, meal, recipes, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.surface, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500,
        maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{day} · {meal}</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rezept suchen..."
            autoFocus style={{
              width: "100%", padding: "10px 14px", background: theme.bg, border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, outline: "none"
            }} />
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "8px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: theme.textDim }}>Keine Rezepte gefunden</div>
          ) : filtered.map(r => (
            <div key={r.id} onClick={() => onSelect(r.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer"
            }}>
              {r.photo ? (
                <div style={{ width: 40, height: 40, borderRadius: 8, backgroundImage: `url(${r.photo})`, backgroundSize: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 8, background: theme.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🍳</div>
              )}
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: theme.textDim }}>{(r.tags || []).join(" · ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shopping List ──────────────────────────────────────────────────
function ShoppingListView({ list, onBack }) {
  const [checked, setChecked] = useState({});
  const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const categories = Object.keys(list).sort();
  const total = Object.values(list).reduce((s, arr) => s + arr.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <Btn variant="ghost" onClick={onBack} style={{ marginBottom: 12 }}>← Zurück zum Plan</Btn>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Einkaufsliste</h2>
        <span style={{ fontSize: 13, color: theme.textDim }}>{done}/{total} erledigt</span>
      </div>

      <div style={{ width: "100%", height: 6, background: theme.surface, borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${total > 0 ? (done / total * 100) : 0}%`, background: theme.success, borderRadius: 3, transition: "width .3s" }} />
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: theme.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{cat}</h3>
          <div style={{ background: theme.card, borderRadius: theme.radiusSm, overflow: "hidden" }}>
            {list[cat].map((item, i) => {
              const key = `${cat}_${item.name}_${item.unit}`;
              const isDone = checked[key];
              return (
                <div key={i} onClick={() => toggle(key)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 14px", cursor: "pointer",
                  borderBottom: i < list[cat].length - 1 ? `1px solid ${theme.border}` : "none",
                  opacity: isDone ? 0.4 : 1, transition: "opacity .2s"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, border: `2px solid ${isDone ? theme.success : theme.border}`,
                      background: isDone ? theme.successSoft : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0
                    }}>{isDone && "✓"}</div>
                    <span style={{ textDecoration: isDone ? "line-through" : "none", fontSize: 14 }}>{item.name}</span>
                  </div>
                  <span style={{ color: theme.accent, fontWeight: 600, fontSize: 13 }}>
                    {Math.round(item.amount * 10) / 10} {item.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
