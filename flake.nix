{
  description = "kbai-ui - Browser-basierter Kanban-Client für kb.ai";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            git
            openssl
          ];

          shellHook = ''
            export NODE_VERSION=22
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "kbai-ui Dev Shell - Ready!"
          '';
        };

        packages.default = pkgs.stdenv.mkDerivation {
          name = "kbai-ui";
          src = ./.;
          buildInputs = [ pkgs.nodejs_22 pkgs.npm ];
          installPhase = "npm install --production && npm run build";
          installAsBinaries = [ "build/index.js" ];
        };
      }
    );
}
