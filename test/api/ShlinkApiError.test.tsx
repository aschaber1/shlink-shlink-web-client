import { render, screen } from '@testing-library/react';
import { Mock } from 'ts-mockery';
import type { ShlinkApiErrorProps } from '../../src/api/ShlinkApiError';
import { ShlinkApiError } from '../../src/api/ShlinkApiError';
import type { InvalidArgumentError, ProblemDetailsError } from '../../src/api/types/errors';
import { ErrorTypeV2, ErrorTypeV3 } from '../../src/api/types/errors';

describe('<ShlinkApiError />', () => {
  const setUp = (props: ShlinkApiErrorProps) => render(<ShlinkApiError {...props} />);

  it.each([
    [undefined, 'the fallback', 'the fallback'],
    [Mock.all<ProblemDetailsError>(), 'the fallback', 'the fallback'],
    [Mock.of<ProblemDetailsError>({ detail: 'the detail' }), 'the fallback', 'the detail'],
  ])('renders proper message', (errorData, fallbackMessage, expectedMessage) => {
    const { container } = setUp({ errorData, fallbackMessage });

    expect(container.firstChild).toHaveTextContent(expectedMessage);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it.each([
    [undefined, 0],
    [Mock.all<ProblemDetailsError>(), 0],
    [Mock.of<InvalidArgumentError>({ type: ErrorTypeV2.INVALID_ARGUMENT, invalidElements: [] }), 1],
    [Mock.of<InvalidArgumentError>({ type: ErrorTypeV3.INVALID_ARGUMENT, invalidElements: [] }), 1],
  ])('renders list of invalid elements when provided error is an InvalidError', (errorData, expectedElementsCount) => {
    setUp({ errorData });
    expect(screen.queryAllByText(/^Invalid elements/)).toHaveLength(expectedElementsCount);
  });
});
