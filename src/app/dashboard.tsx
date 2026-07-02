import React from "react";

const DigestButton = () => {
  const triggerDigest = async () => {
    const response = await fetch("/api/trigger-digest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      alert("Failed to trigger digest");
      return;
    }

    await response.json();
  };

  return <button onClick={triggerDigest}>Generate One Dollar Digest</button>;
};

export default DigestButton;
