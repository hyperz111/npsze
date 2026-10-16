# npsze

Get npm package size.

## Live Try

Just open https://npsze.netlify.app and input the package to check.
Or you can do it via URL, for example https://npsze.netlify.app/?package=react.

## API

If you need `npsze` on your project, you can use our APIs for it.

### Version 0

```
https://npsze.netlify.app/api/v0/
```

You can specify the package to check, version tag, dist tag, and version range are supported.

```
https://npsze.netlify.app/api/v0/react
https://npsze.netlify.app/api/v0/react@latest
https://npsze.netlify.app/api/v0/react@19
https://npsze.netlify.app/api/v0/react@19.0
https://npsze.netlify.app/api/v0/react@19.0.1
https://npsze.netlify.app/api/v0/react@^19
```

This is the result you will get:

```json
{
	"name": "react",
	"version": "19.3.1",
	"unpacked": 178663,
	"install": 178663
}
```

## Prior Art

This project was inspired from [styfle/packagephobia](https://github.com/styfle/packagephobia) and [pastelsky/bundlephobia](https://github.com/pastelsky/bundlephobia).

## License

MIT
