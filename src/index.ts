import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface TodoArguments {
  mrID: string;
}

interface Preferences {
  gitlabToken: string;
  projectID: string;
  gitlabHost: string;
}

export default async function main(props: { arguments: TodoArguments }) {
  const preferences = getPreferenceValues<Preferences>();

  const { gitlabToken, projectID, gitlabHost } = preferences;
  if (!gitlabToken || !gitlabHost || !projectID) {
    await showHUD("Missing preferences");
    return;
  }

  try {
    const data = await fetch(
      `${gitlabHost}/api/v4/projects/${projectID}/merge_requests/${props.arguments.mrID}?private_token=${gitlabToken}`
    );
    const MR: any = await data.json();
    const slackMessage = `NEW MR: [${MR.title}](${MR.web_url})\n@frontend-reviewers`;
    await Clipboard.copy(slackMessage);
    await showHUD("Slack message ready in the clipboard");
  } catch (error) {
    await showHUD("Couldn't load the merge request.");
  }
}
