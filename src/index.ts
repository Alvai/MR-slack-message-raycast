import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface TodoArguments {
  mrID: string;
}

const URL_REGEX = /(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;

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
    // Fetch the MR
    const data = await fetch(
      `${gitlabHost}/api/v4/projects/${projectID}/merge_requests/${props.arguments.mrID}?private_token=${gitlabToken}`
    );
    const MR: any = await data.json();

    // Clean the title because slack doesn't like brackets inside links
    const cleanMRTitle = MR.title.replace("[", "(").replace("]", ")");

    // Start building the slack message with the MR title and link
    let slackMessage = `NEW MR: :gitlab: [${props.arguments.mrID} - ${cleanMRTitle}](${MR.web_url})`;

    // Try to find the line in the description that includes the asana link
    const descriptionLineWithAsanaLink = MR.description
      .split("\n")
      .find((d: string) => d.includes("https://app.asana.com"));

    // if we couldn't find the asana link, add the frontend reviewers tag and copy the message to the clipboard
    if (!descriptionLineWithAsanaLink) {
      slackMessage += "\n@frontend-reviewers";
      await Clipboard.copy(slackMessage);
      await showHUD("Slack message ready in the clipboard");
      return;
    }

    // Try to find the asana link on the line
    const linkMatches = descriptionLineWithAsanaLink.match(URL_REGEX);

    // If we found the link, add it to the slack message
    if (linkMatches.length === 1) {
      const AsanaLink = linkMatches[0];
      slackMessage += `\n:asana: [Task](${AsanaLink})`;
    } else {
      // If we found multiple links, show a warning
      await showHUD(
        linkMatches.length > 1
          ? "We found multiple links on the same line as the asana link. Please check the description of the MR."
          : "we found no asana link on the description"
      );
    }

    // Add the frontend reviewers tag and copy the message to the clipboard
    slackMessage += "\n@frontend-reviewers";

    await Clipboard.copy(slackMessage);
    await showHUD("Slack message ready in the clipboard");
  } catch (error) {
    await showHUD("Couldn't load the merge request.");
  }
}
