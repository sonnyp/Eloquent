import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Soup from "gi://Soup";
import { once } from "../troll/src/async.js";

const Signals = imports.signals;

const signals = {};
Signals.addSignalMethods(signals);

let proc_language_tool;
let ready = false

const PORT = 8081;

async function onReady() {
  if (ready) return;
  await once(signals, "ready");
}

export async function startLanguageTool() {
  if (proc_language_tool) return;

  proc_language_tool = Gio.Subprocess.new(
    [
      "java",
      "-cp",
      "/app/LanguageTool/languagetool-server.jar",
      "org.languagetool.server.HTTPServer",
      // Required for Thunderbird
      // https://forum.languagetool.org/t/problem-with-local-server-with-thunderbird/7313
      "--allow-origin",
      "--port",
      PORT.toString(),
      "--config",
      "/app/share/server.properties"
    ],
    // Gio.SubprocessFlags.NONE,
    Gio.SubprocessFlags.INHERIT_FDS | Gio.SubprocessFlags.STDOUT_PIPE,
  );

  const stdout_stream = new Gio.DataInputStream({
    base_stream: proc_language_tool.get_stdout_pipe(),
    close_base_stream: true,
  });

  for await (const line of createReadLineIterator(stdout_stream)) {
    console.debug(line);
    if (line?.endsWith("Server started")) break;
  }

  signals.emit('ready');
  ready = true;
}

export async function stopLanguageTool() {
  proc_language_tool?.force_exit();
}

const decoder = new TextDecoder();

export async function request(method, path, fields = {}) {
  await onReady();

  // For some reason `send_async` takes 5+s when reusing session
  // message.set_force_http1(true); makes no difference
  const session = new Soup.Session();
  const encoded = Soup.form_encode_hash(fields);

  const message = Soup.Message.new_from_encoded_form(
    method,
    `http://127.0.0.1:${PORT}/v2/${path}`,
    encoded,
  );

  const input_stream = await session.send_async(message, null, null);
  const { status_code, reason_phrase } = message;
  if (status_code !== 200) {
    throw new Error(`Got ${status_code}, ${reason_phrase}`);
  }

  const output_stream = Gio.MemoryOutputStream.new_resizable();
  await output_stream.splice_async(
    input_stream,
    Gio.OutputStreamSpliceFlags.CLOSE_TARGET,
    GLib.PRIORITY_DEFAULT,
    null,
  );
  const bytes = output_stream.steal_as_bytes();

  const str = decoder.decode(bytes.toArray());

  return JSON.parse(str);
}

export async function check(text, language = "auto") {
  return request("POST", "check", { text, language });
}

export async function getLanguages() {
  return request("GET", "languages");
}

Gio._promisify(
  Gio.DataInputStream.prototype,
  "read_line_async",
  "read_line_finish_utf8",
);

async function* createReadLineIterator(dataInputStream, ioPriority = Gio.PRIORITY_DEFAULT) {
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const [line] = await dataInputStream.read_line_async(ioPriority, null)
    if (line === null)
      return;
    yield line;
  }
}
