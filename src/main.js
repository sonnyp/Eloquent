import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Soup from "gi://Soup";
import Xdp from "gi://Xdp";

import Application from "./application.js";

pkg.initGettext();

Gio._promisify(Soup.Session.prototype, "send_async", "send_finish");
Gio._promisify(Gio.OutputStream.prototype, "splice_async", "splice_finish");
Gio._promisify(Gio.Subprocess.prototype, "wait_async", "wait_finish");
Gio._promisify(
  Xdp.Portal.prototype,
  "request_background",
  "request_background_finish",
);
Gio._promisify(
  Xdp.Portal.prototype,
  "set_background_status",
  "set_background_status_finish",
)

export function main(argv) {
  const application = Application();

  if (__DEV__) {
    const restart = new Gio.SimpleAction({
      name: "restart",
      parameter_type: null,
    });
    restart.connect("activate", () => {
      application.quit();
      GLib.spawn_async(null, argv, null, GLib.SpawnFlags.DEFAULT, null);
    });
    application.add_action(restart);
    application.set_accels_for_action("app.restart", ["<Primary><Shift>Q"]);
  }

  return application.runAsync(argv);
}
