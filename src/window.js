import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Gdk from "gi://Gdk";
import Pango from "gi://Pango";

import { build } from "troll";

import { retry, coalesce } from "./util.js";
import { check } from "./languagetool.js";
import DropdownLang from "./DropdownLang.js";

import Interface from "./window.blp" assert { type: "uri" };
import "./widgets/SuggestionPopover.js";
import "./icons/check-round-outline-symbolic.svg" assert { type: "icon" };

let diagnostics = [];

export default function Window({ application }) {
  const {
    window,
    text_view,
    buffer,
    popover_suggestion,
    label_words,
    label_characters,
    label_status,
    spinner,
    image_ok,
    dropdown_langs,
    scrolled_window
  } = build(Interface);

  if (__DEV__) window.add_css_class("devel");
  window.set_application(application);

  popover_suggestion.buffer = buffer;

  // Hide the popover on scroll
  const vadjustment = scrolled_window.vadjustment;
  vadjustment.connect("value-changed", () => {
    popover_suggestion.popdown();
  });

  // Hide the popover on resize
  window.connect('notify::default-width', () => {
    popover_suggestion.popdown();
  });
  window.connect("notify::default-height", () => {
    popover_suggestion.popdown();
  });

  buffer.connect("notify::cursor-position", () => {
    const { cursor_position } = buffer;

    popover_suggestion.reset();

    const iter = buffer.get_iter_at_offset(cursor_position);
    const { tag, start, end } = getTag(iter);
    if (!tag) {
      popover_suggestion.popdown();
      return;
    }


    const diagnostic = getDiagnosticAtOffset(cursor_position)
    if (!diagnostic) {
      popover_suggestion.popdown();
      return;
    }

    const {match} = diagnostic
    popover_suggestion.text_view = text_view;
    popover_suggestion.set_title(match.shortMessage || _("Grammar"));
    popover_suggestion.set_description(match.message);
    popover_suggestion.set_range([start, end]);

    // console.debug(JSON.stringify(match, null, 2));

    match.replacements?.slice(0, 3).forEach((replacement) => {
      popover_suggestion.add_suggestion({ value: replacement.value });
    });


    const loc = text_view.get_iter_location(iter);
    const [x, y] = text_view.buffer_to_window_coords(
      Gtk.TextWindowType.WIDGET,
      loc.x,
      loc.y + loc.height,
    );

    const rectangle = new Gdk.Rectangle({
      x,
      y,
      width: loc.width,
      height: loc.height,
    });
    popover_suggestion.set_pointing_to(rectangle);
    popover_suggestion.popup()
  });

  const tag_table = buffer.get_tag_table();

  // Error tag
  const color_error = new Gdk.RGBA();
  color_error.parse("#e01b24");
  const tag_error = new Gtk.TextTag({
    name: "error",
    underline: Pango.Underline.SINGLE,
    underline_rgba: color_error,
  });
  tag_table.add(tag_error);

  const color_warning = new Gdk.RGBA();
  color_warning.parse("#f5c211");
  const tag_warning = new Gtk.TextTag({
    name: "warning",
    underline: Pango.Underline.SINGLE,
    underline_rgba: color_warning,
  });
  tag_table.add(tag_warning);

  const color_hint = new Gdk.RGBA();
  color_hint.parse("#62a0ea");
  const tag_style = new Gtk.TextTag({
    name: "hint",
    underline: Pango.Underline.SINGLE,
    underline_rgba: color_hint,
  });
  tag_table.add(tag_style);

  function updateStatus(count) {
    spinner.visible = false;

    if (count === 0) {
      label_status.visible = false;
      image_ok.visible = true;
      return;
    }

    label_status.visible = true;
    label_status.label = count?.toString() || "";
    image_ok.visible = false;
  }

  function onReject(err) {
    updateStatus(null);
    if (err.code !== Gio.IOErrorEnum.CONNECTION_REFUSED) {
      logError(err);
    }
  }

  function onResolve(res) {
    // console.log(JSON.stringify(result, null, 2));

    const { matches } = res;
    updateStatus(matches.length);
    handleMatches(buffer, matches);
  }

  const dropown_lang = DropdownLang({ dropdown_langs });

  const scheduleCheck = coalesce(
    () =>
      retry(
        () => check(buffer.text, dropown_lang.getLanguage()),
        2000,
        onReject,
      ),
    onResolve,
  );

  // This isn't perfect but until we have Intl.Segmenter in GJS it will do
  // see https://cestoliv.com/blog/how-to-count-emojis-with-javascript/#4-the-best-solution-to-use-in-production
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1423593
  // Int.Segmenter is also better at counting words
  function updateCounters() {
    let words_count = 0;
    let characters_count = 0;

    const words = buffer.text
      .replace(/[.,?!;()"'-]/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(word => word !== "");
    words_count = words.length;
    const characters = words.join("");
    characters_count = [...characters].length;

    label_words.label = ` ${words_count}`;
    label_characters.label = ` ${characters_count}`;
  }

  function checkGrammar() {
    popover_suggestion.reset();
    popover_suggestion.popdown();
    scheduleCheck();
  }

  dropown_lang.onChange(checkGrammar);

  buffer.connect("changed", () => {
    checkGrammar();
    updateCounters();
  });

  // if (__DEV__) {
  buffer.text = `Write or paste your text here too have it checked continuously. Errors will be underlined in different colours: we will mark seplling errors with red underilnes. Furthermore grammar error's are highlighted in yellow. LanguageTool also marks style issues in a reliable manner by underlining them in blue. Its a impressively versatile tool especially if youd like to tell a colleague from over sea's about what happened at 5 PM in the afternoon on Monday, 27 May 2007.`;
  // }

  text_view.grab_focus();

  window.present();

  return { window };
}

function getTag(iter) {
  const tags = iter.get_tags();

  // Match the tag at cursor position after "a" in
  // to love a elephant
  const ended_tags = iter.get_toggled_tags(false);
  const tag = tags[0] || ended_tags[0];
  if (!tag) return {};

  const start = iter.copy();
  if (!start.starts_tag(tag)) {
    start.backward_to_tag_toggle(tag);
  }
  const end = iter.copy();
  if (!end.ends_tag(tag)) {
    end.forward_to_tag_toggle(tag);
  }

  return { tag, start, end };
}

function getDiagnosticAtOffset(offset) {
  let low = 0;
  let high = diagnostics.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const diagnostic = diagnostics[mid];

    if (offset < diagnostic.start) {
      high = mid - 1;
    } else if (offset > diagnostic.end) {
      low = mid + 1;
    } else {
      return diagnostic;
    }
  }

  return null;
}


function clearDiagnostics(buffer) {
  diagnostics = [];
  buffer.remove_tag_by_name(
    "error",
    buffer.get_start_iter(),
    buffer.get_end_iter(),
  );
  buffer.remove_tag_by_name(
    "warning",
    buffer.get_start_iter(),
    buffer.get_end_iter(),
  );
  buffer.remove_tag_by_name(
    "hint",
    buffer.get_start_iter(),
    buffer.get_end_iter(),
  );
}

function handleMatches(buffer, matches) {
  clearDiagnostics(buffer);

  diagnostics = []

    const offset_map = makeOffsetMap(buffer.text);

  for (const match of matches) {
    const start = offset_map[match.offset]
    const end = offset_map[match.offset + match.length]
    const tag_name = getTagName(match)

    const diagnostic = {
      match,
      start,
      end,
    }

    buffer.apply_tag_by_name(
      tag_name, buffer.get_iter_at_offset(start), buffer.get_iter_at_offset(end)
    );

    diagnostics.push(diagnostic)
  }

  diagnostics = diagnostics.sort((a, b) => a.start - b.start);
}

function getTagName(match) {
  let type = "error";

  if (match.type?.typeName === "Hint") {
    type = "hint";
  } else if (match.rule.issueType === "style") {
    type = "hint";
  } else if (match.type?.typeName === "Other") {
    type = "warning";
  } else if (match.rule.issueType === "inconsistency") {
    type = "warning";
  }

  return type;
}

// LanguageTool uses UTF-16 code-unit offsets.
// GtkTextBuffer uses Unicode-character offsets.
// https://github.com/sonnyp/Eloquent/issues/56
//
// Build this once per text snapshot, then use it for all matches.
function makeOffsetMap(text) {
  const map = new Uint32Array(text.length + 1);

  let utf16Offset = 0;
  let charOffset = 0;

  for (const char of text) {
    map[utf16Offset] = charOffset;

    utf16Offset += char.length;
    charOffset++;
  }

  map[utf16Offset] = charOffset;

  return map;
}

function languageToolRangeToGtkIters(buffer, match, offset_map) {
  const start = offset_map[match.offset];
  const end = offset_map[match.offset + match.length];

  return [
    buffer.get_iter_at_offset(start),
    buffer.get_iter_at_offset(end),
  ];
}
