"use client";

// Каталог: категории и предметы. CRUD без удаления — вместо него
// деактивация (is_active=false), чтобы не ломать ссылки и брони.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FolderTree, Pencil, Plus, Power } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Table,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;

type Category = {
  id: string;
  name_uz: string;
  name_ru: string;
  icon: string | null;
  sort: number;
  is_active: boolean;
  slug: string | null;
};

type Subject = {
  id: string;
  category_id: string;
  name_uz: string;
  name_ru: string;
  slug: string;
  is_active: boolean;
};

async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_uz, name_ru, icon, sort, is_active, slug")
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

async function fetchSubjects(
  categoryId: string,
  page: number,
): Promise<{ rows: Subject[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("subjects")
    .select("id, category_id, name_uz, name_ru, slug, is_active", { count: "exact" });
  if (categoryId) req = req.eq("category_id", categoryId);
  const { data, error, count } = await req
    .order("name_ru", { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as Subject[], total: count ?? 0 };
}

type CategoryForm = {
  id: string | null;
  name_uz: string;
  name_ru: string;
  icon: string;
  sort: string;
  slug: string;
};

type SubjectForm = {
  id: string | null;
  category_id: string;
  name_uz: string;
  name_ru: string;
  slug: string;
};

const EMPTY_CATEGORY: CategoryForm = {
  id: null,
  name_uz: "",
  name_ru: "",
  icon: "",
  sort: "0",
  slug: "",
};

export default function CategoriesPage() {
  const toast = useToast();

  const [tab, setTab] = useState<"categories" | "subjects">("categories");
  const [attempt, setAttempt] = useState(0);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectsTotal, setSubjectsTotal] = useState(0);
  const [subjectPage, setSubjectPage] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState(false);

  const [catForm, setCatForm] = useState<CategoryForm | null>(null);
  const [subjForm, setSubjForm] = useState<SubjectForm | null>(null);
  const [toggleItem, setToggleItem] = useState<
    { kind: "category"; item: Category } | { kind: "subject"; item: Subject } | null
  >(null);
  const [busy, setBusy] = useState(false);

  // loading = списки === null; сбрасываем в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setCategories(null);
    setSubjects(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCategories(), fetchSubjects(categoryFilter, subjectPage)])
      .then(([cats, subj]) => {
        if (cancelled) return;
        setCategories(cats);
        setSubjects(subj.rows);
        setSubjectsTotal(subj.total);
        setError(false);
      })
      .catch((e) => {
        console.error("catalog load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, subjectPage, attempt]);

  const categoryName = useCallback(
    (id: string) => categories?.find((c) => c.id === id)?.name_ru ?? "—",
    [categories],
  );

  // ---------- сохранение категории ----------
  const saveCategory = async () => {
    if (!catForm) return;
    if (!catForm.name_uz.trim() || !catForm.name_ru.trim()) {
      toast("Заполните названия на узбекском и русском.", "error");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      name_uz: catForm.name_uz.trim(),
      name_ru: catForm.name_ru.trim(),
      icon: catForm.icon.trim() || null,
      sort: Number(catForm.sort) || 0,
      slug: catForm.slug.trim() || null,
    };
    const { error: e } = catForm.id
      ? await supabase.from("categories").update(payload).eq("id", catForm.id)
      : await supabase.from("categories").insert(payload);
    setBusy(false);
    if (e) {
      console.error("category save failed:", e);
      toast(
        e.message?.includes("duplicate")
          ? "Такой slug уже занят."
          : "Не удалось сохранить категорию. Попробуйте ещё раз.",
        "error",
      );
      return;
    }
    await logAdminAction(
      catForm.id ? "category_update" : "category_create",
      "categories",
      catForm.id,
      payload,
    );
    toast("Категория сохранена");
    setCatForm(null);
    retry();
  };

  // ---------- сохранение предмета ----------
  const saveSubject = async () => {
    if (!subjForm) return;
    if (!subjForm.category_id) {
      toast("Выберите категорию.", "error");
      return;
    }
    if (!subjForm.name_uz.trim() || !subjForm.name_ru.trim() || !subjForm.slug.trim()) {
      toast("Заполните названия и slug.", "error");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      category_id: subjForm.category_id,
      name_uz: subjForm.name_uz.trim(),
      name_ru: subjForm.name_ru.trim(),
      slug: subjForm.slug.trim().toLowerCase(),
    };
    const { error: e } = subjForm.id
      ? await supabase.from("subjects").update(payload).eq("id", subjForm.id)
      : await supabase.from("subjects").insert(payload);
    setBusy(false);
    if (e) {
      console.error("subject save failed:", e);
      toast(
        e.message?.includes("duplicate")
          ? "Такой slug уже занят."
          : "Не удалось сохранить предмет. Попробуйте ещё раз.",
        "error",
      );
      return;
    }
    await logAdminAction(
      subjForm.id ? "subject_update" : "subject_create",
      "subjects",
      subjForm.id,
      payload,
    );
    toast("Предмет сохранён");
    setSubjForm(null);
    retry();
  };

  // ---------- вкл/выкл ----------
  const runToggle = async () => {
    if (!toggleItem) return;
    setBusy(true);
    const supabase = createClient();
    const table = toggleItem.kind === "category" ? "categories" : "subjects";
    const next = !toggleItem.item.is_active;
    const { error: e } = await supabase
      .from(table)
      .update({ is_active: next })
      .eq("id", toggleItem.item.id);
    setBusy(false);
    if (e) {
      console.error("toggle failed:", e);
      toast("Не удалось изменить статус. Попробуйте ещё раз.", "error");
      return;
    }
    await logAdminAction(
      `${toggleItem.kind}_toggle_active`,
      table,
      toggleItem.item.id,
      { is_active: next },
    );
    toast(next ? "Включено" : "Отключено");
    setToggleItem(null);
    retry();
  };

  const tabButton = (key: "categories" | "subjects", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={
        tab === key
          ? "rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white"
          : "rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
      }
    >
      {label}
    </button>
  );

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить каталог"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-zinc-200 bg-white p-1">
          {tabButton("categories", "Категории")}
          {tabButton("subjects", "Предметы")}
        </div>
        <Button
          onClick={() =>
            tab === "categories"
              ? setCatForm({ ...EMPTY_CATEGORY })
              : setSubjForm({
                  id: null,
                  category_id: categoryFilter || categories?.[0]?.id || "",
                  name_uz: "",
                  name_ru: "",
                  slug: "",
                })
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          {tab === "categories" ? "Новая категория" : "Новый предмет"}
        </Button>
      </div>

      {tab === "categories" ? (
        <Card>
          {categories === null ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="Категорий пока нет"
              text="Создайте первую категорию каталога."
              action={
                <Button onClick={() => setCatForm({ ...EMPTY_CATEGORY })}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Новая категория
                </Button>
              }
            />
          ) : (
            <Table headers={["Название (uz)", "Название (ru)", "Иконка", "Порядок", "Статус", ""]}>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-zinc-900">{c.name_uz}</td>
                  <td>{c.name_ru}</td>
                  <td className="font-mono text-xs text-zinc-500">{c.icon || "—"}</td>
                  <td>{c.sort}</td>
                  <td>
                    {c.is_active ? (
                      <Badge tone="emerald">Активна</Badge>
                    ) : (
                      <Badge tone="zinc">Отключена</Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Редактировать"
                        onClick={() =>
                          setCatForm({
                            id: c.id,
                            name_uz: c.name_uz,
                            name_ru: c.name_ru,
                            icon: c.icon ?? "",
                            sort: String(c.sort),
                            slug: c.slug ?? "",
                          })
                        }
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={c.is_active ? "Отключить" : "Включить"}
                        onClick={() => setToggleItem({ kind: "category", item: c })}
                        className={`rounded-lg p-1.5 hover:bg-zinc-100 ${
                          c.is_active ? "text-brand" : "text-zinc-400"
                        }`}
                      >
                        <Power className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          <div className="mb-4 w-64">
            <Select
              label="Категория"
              value={categoryFilter}
              onChange={(e) => {
                setSubjects(null);
                setError(false);
                setSubjectPage(0);
                setCategoryFilter(e.target.value);
              }}
            >
              <option value="">Все категории</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ru}
                </option>
              ))}
            </Select>
          </div>
          {subjects === null ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="Предметов не найдено"
              text="Создайте предмет или измените фильтр."
            />
          ) : (
            <>
              <Table
                headers={["Название (uz)", "Название (ru)", "Категория", "Slug", "Статус", ""]}
              >
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium text-zinc-900">{s.name_uz}</td>
                    <td>{s.name_ru}</td>
                    <td className="text-zinc-600">{categoryName(s.category_id)}</td>
                    <td className="font-mono text-xs text-zinc-500">{s.slug}</td>
                    <td>
                      {s.is_active ? (
                        <Badge tone="emerald">Активен</Badge>
                      ) : (
                        <Badge tone="zinc">Отключён</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Редактировать"
                          onClick={() =>
                            setSubjForm({
                              id: s.id,
                              category_id: s.category_id,
                              name_uz: s.name_uz,
                              name_ru: s.name_ru,
                              slug: s.slug,
                            })
                          }
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title={s.is_active ? "Отключить" : "Включить"}
                          onClick={() => setToggleItem({ kind: "subject", item: s })}
                          className={`rounded-lg p-1.5 hover:bg-zinc-100 ${
                            s.is_active ? "text-brand" : "text-zinc-400"
                          }`}
                        >
                          <Power className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                page={subjectPage}
                pageSize={PAGE_SIZE}
                total={subjectsTotal}
                onPage={(p) => {
                  setSubjects(null);
                  setSubjectPage(p);
                }}
              />
            </>
          )}
        </Card>
      )}

      {/* Форма категории */}
      <Modal
        open={catForm !== null}
        onClose={() => setCatForm(null)}
        title={catForm?.id ? "Редактировать категорию" : "Новая категория"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCatForm(null)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={saveCategory}>
              Сохранить
            </Button>
          </>
        }
      >
        {catForm && (
          <div className="space-y-3">
            <Input
              label="Название (uz)"
              value={catForm.name_uz}
              onChange={(e) => setCatForm({ ...catForm, name_uz: e.target.value })}
            />
            <Input
              label="Название (ru)"
              value={catForm.name_ru}
              onChange={(e) => setCatForm({ ...catForm, name_ru: e.target.value })}
            />
            <Input
              label="Иконка (слаг lucide, напр. languages)"
              value={catForm.icon}
              onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Порядок"
                type="number"
                value={catForm.sort}
                onChange={(e) => setCatForm({ ...catForm, sort: e.target.value })}
              />
              <Input
                label="Slug (URL)"
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Форма предмета */}
      <Modal
        open={subjForm !== null}
        onClose={() => setSubjForm(null)}
        title={subjForm?.id ? "Редактировать предмет" : "Новый предмет"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubjForm(null)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={saveSubject}>
              Сохранить
            </Button>
          </>
        }
      >
        {subjForm && (
          <div className="space-y-3">
            <Select
              label="Категория"
              value={subjForm.category_id}
              onChange={(e) => setSubjForm({ ...subjForm, category_id: e.target.value })}
            >
              <option value="">— выберите —</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ru}
                </option>
              ))}
            </Select>
            <Input
              label="Название (uz)"
              value={subjForm.name_uz}
              onChange={(e) => setSubjForm({ ...subjForm, name_uz: e.target.value })}
            />
            <Input
              label="Название (ru)"
              value={subjForm.name_ru}
              onChange={(e) => setSubjForm({ ...subjForm, name_ru: e.target.value })}
            />
            <Input
              label="Slug (URL, латиницей)"
              value={subjForm.slug}
              onChange={(e) => setSubjForm({ ...subjForm, slug: e.target.value })}
            />
          </div>
        )}
      </Modal>

      {/* Подтверждение вкл/выкл */}
      <Modal
        open={toggleItem !== null}
        onClose={() => setToggleItem(null)}
        title={
          toggleItem?.item.is_active
            ? `Отключить ${toggleItem.kind === "category" ? "категорию" : "предмет"}?`
            : `Включить ${toggleItem?.kind === "category" ? "категорию" : "предмет"}?`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setToggleItem(null)}>
              Отмена
            </Button>
            <Button
              variant={toggleItem?.item.is_active ? "danger" : "primary"}
              loading={busy}
              onClick={runToggle}
            >
              {toggleItem?.item.is_active ? "Отключить" : "Включить"}
            </Button>
          </>
        }
      >
        {toggleItem && (
          <p className="text-sm text-zinc-600">
            «{toggleItem.item.name_ru}» —{" "}
            {toggleItem.item.is_active
              ? "перестанет показываться в каталоге. Данные сохранятся, удаление не требуется."
              : "снова появится в каталоге."}
          </p>
        )}
      </Modal>
    </div>
  );
}
