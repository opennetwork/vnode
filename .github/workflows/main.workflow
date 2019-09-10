workflow "Build, Test, and Publish" {
  on = "push"
  resolves = ["Publish"]
}

action "Build" {
  uses = "nuxt/actions-yarn@master"
  args = "install"
}

action "Test" {
  needs = "Build"
  uses = "nuxt/actions-yarn@master"
  args = "test"
}

# Filter for a new tag
action "Tag" {
  needs = "Test"
  uses = "actions/bin/filter@master"
  args = "tag"
}

action "Publish" {
  needs = "Tag"
  uses = "nuxt/actions-yarn@master"
  args = "publish --access public"
  secrets = ["NPM_AUTH_TOKEN"]
}
