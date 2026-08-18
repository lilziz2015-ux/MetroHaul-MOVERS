"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const db = window.metroHaulDb || window.metroHaulDB || window.db;
  if (!db) return;
  const form = document.getElementById("galleryUploadForm");
  const filesInput = document.getElementById("galleryFiles");
  const grid = document.getElementById("galleryAdminGrid");
  const count = document.getElementById("galleryAdminCount");
  const message = document.getElementById("galleryAdminMessage");
  const uploadButton = document.getElementById("galleryUploadButton");
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const maxSize = 10 * 1024 * 1024;
  let rows = [];

  function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `admin-settings-message ${type}`;
    message.hidden = false;
  }

  function safeName(name) {
    return String(name || "gallery-photo").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100);
  }

  function publicUrl(path) {
    return db.storage.from("gallery").getPublicUrl(path).data.publicUrl;
  }

  function render() {
    count.textContent = `${rows.length} photo${rows.length === 1 ? "" : "s"}`;
    if (!rows.length) {
      grid.innerHTML = '<p class="gallery-admin-empty">No gallery photos yet. Upload the first project photo above.</p>';
      return;
    }
    grid.innerHTML = rows.map(row => `
      <article class="gallery-admin-card" data-gallery-id="${row.id}">
        <img src="${publicUrl(row.storage_path)}" alt="">
        <div class="gallery-admin-card-body">
          <label>Caption<input data-field="caption" maxlength="140" value="${escapeAttribute(row.caption)}"></label>
          <label>Location<input data-field="location" maxlength="100" value="${escapeAttribute(row.location)}"></label>
          <label>Description<input data-field="alt_text" maxlength="180" value="${escapeAttribute(row.alt_text)}"></label>
          <label>Order<input data-field="display_order" type="number" min="0" step="1" value="${Number(row.display_order) || 0}"></label>
          <div class="gallery-admin-switches"><label><input data-field="is_published" type="checkbox" ${row.is_published ? "checked" : ""}> Published</label><label><input data-field="is_featured" type="checkbox" ${row.is_featured ? "checked" : ""}> Featured</label></div>
          <div class="gallery-admin-actions"><button type="button" class="admin-secondary-button" data-action="save">Save</button><button type="button" class="admin-danger-button" data-action="delete">Delete</button></div>
        </div>
      </article>`).join("");
  }

  function escapeAttribute(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  async function load() {
    const { data, error } = await db.from("gallery_images").select("*").order("is_featured", { ascending: false }).order("display_order").order("created_at", { ascending: false });
    if (error) throw error;
    rows = data || [];
    render();
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const files = Array.from(filesInput.files || []);
    const invalid = files.find(file => !allowedTypes.has(file.type) || file.size > maxSize);
    if (!files.length || invalid) {
      showMessage(invalid ? `${invalid.name} must be JPG, PNG or WebP and no larger than 10 MB.` : "Choose at least one photo.", "error");
      return;
    }
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading…";
    let uploaded = 0;
    try {
      for (const file of files) {
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const { error: storageError } = await db.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
        if (storageError) throw storageError;
        const { error: rowError } = await db.from("gallery_images").insert({
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          caption: document.getElementById("galleryCaption").value.trim() || null,
          location: document.getElementById("galleryLocation").value.trim() || null,
          alt_text: document.getElementById("galleryAlt").value.trim() || "Metro Haul moving project",
          is_published: document.getElementById("galleryPublished").checked,
          is_featured: document.getElementById("galleryFeatured").checked
        });
        if (rowError) {
          await db.storage.from("gallery").remove([path]);
          throw rowError;
        }
        uploaded += 1;
      }
      form.reset();
      document.getElementById("galleryPublished").checked = true;
      showMessage(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded.`);
      await load();
    } catch (error) {
      console.error("Gallery upload error:", error);
      showMessage(error.message || "The photos could not be uploaded.", "error");
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = "Upload Photos";
    }
  });

  grid?.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    const card = event.target.closest("[data-gallery-id]");
    if (!button || !card) return;
    const row = rows.find(item => item.id === card.dataset.galleryId);
    if (!row) return;
    button.disabled = true;
    try {
      if (button.dataset.action === "delete") {
        if (!window.confirm("Remove this photo from the website gallery?")) return;
        const { error: storageError } = await db.storage.from("gallery").remove([row.storage_path]);
        if (storageError) throw storageError;
        const { error } = await db.from("gallery_images").delete().eq("id", row.id);
        if (error) throw error;
        showMessage("Photo removed.");
      } else {
        const value = field => card.querySelector(`[data-field="${field}"]`);
        const { error } = await db.from("gallery_images").update({
          caption: value("caption").value.trim() || null,
          location: value("location").value.trim() || null,
          alt_text: value("alt_text").value.trim() || "Metro Haul moving project",
          display_order: Math.max(0, Number(value("display_order").value) || 0),
          is_published: value("is_published").checked,
          is_featured: value("is_featured").checked,
          updated_at: new Date().toISOString()
        }).eq("id", row.id);
        if (error) throw error;
        showMessage("Photo saved.");
      }
      await load();
    } catch (error) {
      console.error("Gallery action error:", error);
      showMessage(error.message || "The gallery could not be updated.", "error");
    } finally {
      button.disabled = false;
    }
  });

  try { await load(); } catch (error) { console.error(error); showMessage("Gallery could not be loaded.", "error"); }
});
