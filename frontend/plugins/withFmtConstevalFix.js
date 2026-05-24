const { withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const TAG = 'fmt-consteval-fix';

const PATCH_BLOCK = `    fmt_inl = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'format-inl.h')
    if File.exist?(fmt_inl)
      fmt_original = File.read(fmt_inl)
      fmt_patched = fmt_original.dup
      [
        ['fmt::format_to(it, FMT_STRING("{}{}"), message, SEP);',
         'fmt::format_to(it, fmt::runtime("{}{}"), message, SEP);'],
        ['fmt::format_to(it, FMT_STRING("{}{}"), ERROR_STR, error_code);',
         'fmt::format_to(it, fmt::runtime("{}{}"), ERROR_STR, error_code);'],
        ['out = fmt::format_to(out, FMT_STRING("{:x}"), value);',
         'out = fmt::format_to(out, fmt::runtime("{:x}"), value);'],
        ['out = fmt::format_to(out, FMT_STRING("{:08x}"), value);',
         'out = fmt::format_to(out, fmt::runtime("{:08x}"), value);'],
        ['out = fmt::format_to(out, FMT_STRING("p{}"),',
         'out = fmt::format_to(out, fmt::runtime("p{}"),'],
      ].each { |from, to| fmt_patched.sub!(from, to) }
      if fmt_patched != fmt_original
        File.write(fmt_inl, fmt_patched)
        Pod::UI.puts "Patched fmt/format-inl.h for Clang 21 consteval compatibility".green
      end
    end`;

const withFmtConstevalFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      const original = fs.readFileSync(podfilePath, 'utf8');

      const result = mergeContents({
        tag: TAG,
        src: original,
        newSrc: PATCH_BLOCK,
        anchor: /post_install do \|installer\|/,
        offset: 1,
        comment: '#',
      });

      if (!result.didMerge && !result.didClear) {
        console.warn(
          '[withFmtConstevalFix] Could not find "post_install do |installer|" anchor in Podfile; skipping injection. Build may fail on Xcode 26+ with Clang 21.'
        );
        return config;
      }

      fs.writeFileSync(podfilePath, result.contents);
      return config;
    },
  ]);
};

module.exports = withFmtConstevalFix;
