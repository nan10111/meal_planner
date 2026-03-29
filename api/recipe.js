export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parameter required" });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MealPlanner/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.5"
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
    }

    const html = await response.text();

    // Extract JSON-LD blocks
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let recipe = null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        let data = JSON.parse(match[1]);

        // Handle @graph arrays
        if (data["@graph"]) {
          data = data["@graph"];
        }

        // If it's an array, search for Recipe type
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
              recipe = item;
              break;
            }
          }
        } else if (data["@type"] === "Recipe" || (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))) {
          recipe = data;
        }

        if (recipe) break;
      } catch (e) {
        // skip invalid JSON-LD blocks
      }
    }

    if (!recipe) {
      return res.status(404).json({ error: "No Recipe schema found on this page" });
    }

    // Extract and normalize recipe data
    const result = {
      name: recipe.name || "",
      image: null,
      servings: null,
      ingredients: [],
      steps: "",
    };

    // Image
    if (recipe.image) {
      if (typeof recipe.image === "string") result.image = recipe.image;
      else if (Array.isArray(recipe.image)) result.image = typeof recipe.image[0] === "string" ? recipe.image[0] : recipe.image[0]?.url;
      else if (recipe.image.url) result.image = recipe.image.url;
    }

    // Servings
    if (recipe.recipeYield) {
      const yieldVal = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
      const servMatch = String(yieldVal).match(/(\d+)/);
      if (servMatch) result.servings = parseInt(servMatch[1]);
    }

    // Ingredients (raw strings from schema)
    if (recipe.recipeIngredient) {
      result.ingredients = recipe.recipeIngredient.map(i => typeof i === "string" ? i : (i.name || String(i)));
    }

    // Instructions
    if (recipe.recipeInstructions) {
      const instructions = recipe.recipeInstructions;
      if (typeof instructions === "string") {
        result.steps = instructions;
      } else if (Array.isArray(instructions)) {
        const stepTexts = [];
        for (const step of instructions) {
          if (typeof step === "string") {
            stepTexts.push(step);
          } else if (step["@type"] === "HowToStep") {
            stepTexts.push(step.text || step.name || "");
          } else if (step["@type"] === "HowToSection") {
            if (step.name) stepTexts.push(`\n${step.name}:`);
            if (step.itemListElement) {
              for (const subStep of step.itemListElement) {
                stepTexts.push(typeof subStep === "string" ? subStep : (subStep.text || subStep.name || ""));
              }
            }
          }
        }
        result.steps = stepTexts.filter(s => s.trim()).join("\n");
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
