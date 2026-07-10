(function () {
  var SCRIPT_ATTRIBUTE = "data-ai-sports-widget";
  var DEFAULT_HEIGHT = 360;

  function currentOrigin() {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      try {
        return new URL(currentScript.src).origin;
      } catch (_error) {
        return "https://www.ai-sports-prediction.net";
      }
    }

    return "https://www.ai-sports-prediction.net";
  }

  function normalizeBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return value !== "0" && value !== "false" && value !== "no";
  }

  function buildFrameUrl(origin, source) {
    var params = new URLSearchParams();
    var dataset = source.dataset || {};
    var keys = [
      "type",
      "sport",
      "competition",
      "matchId",
      "limit",
      "title",
      "theme",
      "accent",
      "background",
      "text",
      "radius",
      "apiKey",
      "publisherKey",
      "showReasoning"
    ];

    keys.forEach(function (key) {
      var value = dataset[key];
      if (value) params.set(key, value);
    });

    if (dataset.showBranding !== undefined) {
      params.set("showBranding", normalizeBoolean(dataset.showBranding, true) ? "1" : "0");
    }

    if (dataset.showReasoning !== undefined) {
      params.set("showReasoning", normalizeBoolean(dataset.showReasoning, true) ? "1" : "0");
    }

    try {
      params.set("sourceOrigin", window.location.origin);
    } catch (_error) {
      // Leave origin empty in unusual embed contexts.
    }

    return origin + "/widget-frame.html?" + params.toString();
  }

  function mountWidget(target, origin) {
    if (target.__aiSportsWidgetMounted) return;
    target.__aiSportsWidgetMounted = true;

    var iframe = document.createElement("iframe");
    iframe.src = buildFrameUrl(origin, target);
    iframe.title = target.dataset.title || "AI Sports Prediction widget";
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.maxWidth = target.dataset.maxWidth || "720px";
    iframe.style.height = (Number(target.dataset.height) || DEFAULT_HEIGHT) + "px";
    iframe.style.border = "0";
    iframe.style.borderRadius = (target.dataset.radius || "8") + "px";
    iframe.style.overflow = "hidden";
    iframe.setAttribute("scrolling", "no");

    target.replaceChildren(iframe);
  }

  function init() {
    var origin = currentOrigin();
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[" + SCRIPT_ATTRIBUTE + "]"));
    var currentScript = document.currentScript;

    if (currentScript && currentScript.hasAttribute(SCRIPT_ATTRIBUTE)) {
      var mount = document.createElement("div");
      Object.keys(currentScript.dataset).forEach(function (key) {
        mount.dataset[key] = currentScript.dataset[key];
      });
      currentScript.parentNode.insertBefore(mount, currentScript);
      nodes.push(mount);
    }

    nodes.forEach(function (node) {
      if (node.tagName && node.tagName.toLowerCase() === "script") return;
      mountWidget(node, origin);
    });

    window.addEventListener("message", function (event) {
      if (event.origin !== origin || !event.data || event.data.type !== "ai-sports-widget-height") return;

      Array.prototype.slice.call(document.querySelectorAll("iframe[src^='" + origin + "/widget-frame.html']")).forEach(function (iframe) {
        if (iframe.contentWindow === event.source) {
          iframe.style.height = Math.max(180, Math.min(900, Number(event.data.height) || DEFAULT_HEIGHT)) + "px";
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
