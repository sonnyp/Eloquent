<img style="vertical-align: middle;" src="data/icons/re.sonny.Eloquent.svg" width="120" height="120" align="left">

# Eloquent

Your proofreading assistant

<a href='https://flathub.org/apps/re.sonny.Eloquent'><img width='240' alt='Get it on Flathub' src='https://flathub.org/api/badge?locale=en'/></a>

Eloquent is a proofreading software for English, Spanish, French, German, Portuguese, Polish, Dutch, and more than 20 other languages. It finds many errors that a simple spell checker cannot detect.

It works fully offline, powered by [LanguageTool standalone server](https://github.com/languagetool-org/languagetool/tree/master/languagetool-standalone).

![screenshot](data/screenshot.png)

Eloquent is also able to run as a service in the background to make your local/offline LanguageTool server available to [Firefox, LibreOffice and more](https://dev.languagetool.org/software-that-supports-languagetool-as-a-plug-in-or-add-on). Change the settings to use local LanguageTool, here is an example for the Firefox addon

![](./data/firefox-addon.png)



<!--
## Development

```sh
cd Eloquent
npm install
make dev
```

Make changes and press `<Primary><Shift>Q` on the Eloquent window to restart it.

Use `<Primary><Shift>I` to open the inspector.

```
java -cp LanguageTool-6.5/languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
```

-->

## Maintainer

<details>
  <summary>Bookmarks</summary>

- [Flathub](https://flathub.org/apps/re.sonny.Eloquent)
- [Flathub manifest](https://github.com/flathub/re.sonny.Eloquent)
- [Flathub builds](https://flathub.org/en/builds/apps/re.sonny.Eloquent)
- [Flathub stats](https://klausenbusk.github.io/flathub-stats/#ref=re.sonny.Eloquent)
</details>

<details>

<summary>Publish new version</summary>

- update metainfo and screenshot
- `meson compile re.sonny.Eloquent-pot -C build`
- `meson compile re.sonny.Eloquent-update-po -C build`
- Update version in `meson.build`
- git tag
- flathub

</details>

## Copyright

© 2025 [Sonny Piers](https://github.com/sonnyp)

## License

GPLv3. Please see [COPYING](COPYING) file.

## Notes

Grammer checker

- https://github.com/btford/write-good (en)
- https://grammalecte.net/ (fr)
- https://github.com/languagetool-org/languagetool (multi)
- https://1.6km.me/blog/2021/03/30/the-poor-mans-grammar-checker/
- https://writewithharper.com/

NLP

- https://web.archive.org/web/20230321055642/https://www.abisource.com/projects/link-grammar/
- https://naturalnode.github.io/natural/
