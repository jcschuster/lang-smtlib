{
  description = "lang-smtlib: editor language support for SMT-LIB 2.7";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26
            pnpm
            jq # .github/scripts/version.sh
            z3 # .github/scripts/check-fixtures.sh
            cvc5
            poppler-utils # pdftotext, to read a new reference (spec/README.md)
          ];
        };
      });
    };
}
