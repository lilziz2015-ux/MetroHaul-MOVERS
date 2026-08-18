"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("publicGalleryGrid");
  const status = document.getElementById("publicGalleryStatus");
  const config = window.METRO_HAUL_SUPABASE;
  if (!grid || !status || !config) return;

  function escapeHTML(value) {
    const node = document.createElement("div");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/gallery_images?select=id,storage_path,alt_text,caption,location,is_featured&is_published=eq.true&order=is_featured.desc,display_order.asc,created_at.desc`, {
      headers: { apikey: config.publishableKey }
    });
    if (!response.ok) throw new Error("Gallery request failed");
    const images = await response.json();
    if (!images.length) {
      status.textContent = "New project photos are coming soon.";
      return;
    }
    status.hidden = true;
    grid.innerHTML = images.map(image => {
      const url = `${config.url}/storage/v1/object/public/gallery/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`;
      return `<figure class="public-gallery-card${image.is_featured ? " featured" : ""}"><button type="button" class="public-gallery-open" data-gallery-src="${escapeHTML(url)}" data-gallery-alt="${escapeHTML(image.alt_text || "Metro Haul moving project")}"><img src="${escapeHTML(url)}" alt="${escapeHTML(image.alt_text || "Metro Haul moving project")}" loading="lazy" decoding="async"></button>${image.caption || image.location ? `<figcaption>${image.caption ? `<strong>${escapeHTML(image.caption)}</strong>` : ""}${image.location ? `<span>${escapeHTML(image.location)}</span>` : ""}</figcaption>` : ""}</figure>`;
    }).join("");

    grid.addEventListener("click", event => {
      const button = event.target.closest("[data-gallery-src]");
      if (!button) return;
      const dialog = document.createElement("dialog");
      dialog.className = "gallery-lightbox";
      dialog.innerHTML = `<button type="button" aria-label="Close gallery image">×</button><img src="${escapeHTML(button.dataset.gallerySrc)}" alt="${escapeHTML(button.dataset.galleryAlt)}">`;
      document.body.append(dialog);
      dialog.querySelector("button").addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener("close", () => dialog.remove());
      dialog.showModal();
    });
  } catch (error) {
    console.error("Gallery load error:", error);
    status.textContent = "The gallery is temporarily unavailable. Please check back soon.";
  }
});
