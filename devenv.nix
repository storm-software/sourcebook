{ ... }:
{
  name = "storm-software/sourcebook";

  dotenv.enable = true;
  dotenv.filename = [
    ".env"
    ".env.local"
  ];
  dotenv.disableHint = true;
}
