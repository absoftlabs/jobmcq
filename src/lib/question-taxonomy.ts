import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type QuestionCategoryRow = Tables<"question_categories">;
export type QuestionSubcategoryRow = Tables<"question_subcategories">;

export const normalizeName = (value: string) => value.trim();

export const slugifyName = (value: string) => {
  const normalized = normalizeName(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
};

export const loadQuestionTaxonomy = async () => {
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase
      .from("question_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("question_subcategories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (categoriesRes.error) {
    throw categoriesRes.error;
  }

  if (subcategoriesRes.error) {
    throw subcategoriesRes.error;
  }

  return {
    categories: (categoriesRes.data || []) as QuestionCategoryRow[],
    subcategories: (subcategoriesRes.data || []) as QuestionSubcategoryRow[],
  };
};

export const ensureQuestionTaxonomy = async (
  categoryName: string,
  subcategoryName?: string | null,
) => {
  const normalizedCategory = normalizeName(categoryName);
  const normalizedSubcategory = normalizeName(subcategoryName || "");

  if (!normalizedCategory) {
    return { category: null, subcategory: null };
  }

  const categorySlug = slugifyName(normalizedCategory);
  let category: QuestionCategoryRow | null = null;

  const existingCategory = await supabase
    .from("question_categories")
    .select("*")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (existingCategory.error) {
    throw existingCategory.error;
  }

  if (existingCategory.data) {
    category = existingCategory.data as QuestionCategoryRow;
    if (category.name !== normalizedCategory) {
      const updatedCategory = await supabase
        .from("question_categories")
        .update({ name: normalizedCategory })
        .eq("id", category.id)
        .select("*")
        .single();

      if (updatedCategory.error) {
        throw updatedCategory.error;
      }

      category = updatedCategory.data as QuestionCategoryRow;
    }
  } else {
    const createdCategory = await supabase
      .from("question_categories")
      .insert({
        name: normalizedCategory,
        slug: categorySlug,
      })
      .select("*")
      .single();

    if (createdCategory.error) {
      throw createdCategory.error;
    }

    category = createdCategory.data as QuestionCategoryRow;
  }

  if (!normalizedSubcategory || !category) {
    return { category, subcategory: null };
  }

  const subcategorySlug = slugifyName(normalizedSubcategory);
  let subcategory: QuestionSubcategoryRow | null = null;

  const existingSubcategory = await supabase
    .from("question_subcategories")
    .select("*")
    .eq("category_id", category.id)
    .eq("slug", subcategorySlug)
    .maybeSingle();

  if (existingSubcategory.error) {
    throw existingSubcategory.error;
  }

  if (existingSubcategory.data) {
    subcategory = existingSubcategory.data as QuestionSubcategoryRow;
    if (subcategory.name !== normalizedSubcategory) {
      const updatedSubcategory = await supabase
        .from("question_subcategories")
        .update({ name: normalizedSubcategory })
        .eq("id", subcategory.id)
        .select("*")
        .single();

      if (updatedSubcategory.error) {
        throw updatedSubcategory.error;
      }

      subcategory = updatedSubcategory.data as QuestionSubcategoryRow;
    }
  } else {
    const createdSubcategory = await supabase
      .from("question_subcategories")
      .insert({
        category_id: category.id,
        name: normalizedSubcategory,
        slug: subcategorySlug,
      })
      .select("*")
      .single();

    if (createdSubcategory.error) {
      throw createdSubcategory.error;
    }

    subcategory = createdSubcategory.data as QuestionSubcategoryRow;
  }

  return { category, subcategory };
};
